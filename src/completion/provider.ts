import * as vscode from 'vscode';
import { fimComplete, fimRequestPayloadSizes } from '../api/fim';
import { HttpStatusError } from '../api/client';
import { getApiKey, getConfig } from '../config';
import { gatherRelatedContext } from './relatedContext';
import { log, logContextDebug, logFimPayloadDebug, logRelatedContextDebug } from '../ui/output';
import { StatusBar } from '../ui/statusBar';
import { simpleHash } from '../util/hash';
import { extractPrefixSuffix } from './context';
import { postProcessCompletion } from './postprocess';

const CACHE_TTL_MS = 5000;
const CACHE_MAX = 50;

interface CacheEntry {
	key: string;
	text: string;
	expires: number;
}

export class LocalAiInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
	private abortController: AbortController | undefined;
	private cache: CacheEntry | undefined;
	private readonly cacheMap = new Map<string, CacheEntry>();

	constructor(
		private readonly secrets: vscode.SecretStorage,
		private readonly statusBar: StatusBar
	) {}

	abortInFlight(): void {
		this.abortController?.abort();
		this.abortController = undefined;
	}

	clearCache(): void {
		this.cache = undefined;
		this.cacheMap.clear();
	}

	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		_context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[] | undefined> {
		const config = getConfig();
		if (!config.enabled || !config.model || !config.baseUrl) {
			return undefined;
		}

		if (document.uri.scheme !== 'file') {
			return undefined;
		}

		const active = vscode.window.activeTextEditor;
		if (
			active &&
			active.document.uri.toString() === document.uri.toString() &&
			!active.selection.isEmpty
		) {
			return undefined;
		}

		const { prefix, suffix } = extractPrefixSuffix(
			document,
			position,
			config.prefixMaxChars,
			config.suffixMaxChars
		);

		logContextDebug(prefix, suffix);

		if (token.isCancellationRequested) {
			return undefined;
		}

		const related = await gatherRelatedContext(document, config, token);
		if (token.isCancellationRequested) {
			return undefined;
		}
		logRelatedContextDebug(related.paths, related.text.length, related.text);

		const fimReq = { prefix, suffix, config, relatedContext: related.text };
		logFimPayloadDebug(fimRequestPayloadSizes(fimReq));

		const cacheKey = `${document.uri.toString()}:v${document.version}:${config.model}:${config.fimMode}:${simpleHash(prefix)}:${simpleHash(suffix)}:${simpleHash(related.text)}`;
		const hit = this.getCache(cacheKey);
		if (hit) {
			return this.toItems(position, hit);
		}

		this.abortController?.abort();
		this.abortController = new AbortController();
		const signal = this.abortController.signal;
		token.onCancellationRequested(() => this.abortController?.abort());

		this.statusBar.setState('loading');

		try {
			const apiKey = await getApiKey(this.secrets);
			const middle = await fimComplete(fimReq, {
					baseUrl: config.baseUrl,
					apiKey,
					timeoutMs: config.requestTimeoutMs,
					signal,
				}
			);

			if (token.isCancellationRequested || signal.aborted) {
				this.statusBar.setState('ready', config.model);
				return undefined;
			}

			if (!middle) {
				this.statusBar.setState('ready', config.model);
				return undefined;
			}

			const processed = postProcessCompletion(
				middle,
				prefix,
				suffix,
				config.stop,
				config.maxTokens
			);
			if (!processed) {
				this.statusBar.setState('ready', config.model);
				return undefined;
			}

			this.setCache(cacheKey, processed);
			log(`Completion ${processed.length} chars`, true);
			this.statusBar.setState('ready', config.model);
			return this.toItems(position, processed);
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				this.statusBar.setState('ready', config.model);
				return undefined;
			}
			const msg =
				err instanceof HttpStatusError
					? err.message
					: err instanceof Error
						? err.message
						: String(err);
			log(msg);
			this.statusBar.setState('error', msg);
			return undefined;
		}
	}

	private getCache(key: string): string | undefined {
		const now = Date.now();
		if (this.cache?.key === key && this.cache.expires > now) {
			return this.cache.text;
		}
		const fromMap = this.cacheMap.get(key);
		if (fromMap && fromMap.expires > now) {
			return fromMap.text;
		}
		return undefined;
	}

	private setCache(key: string, text: string): void {
		const entry: CacheEntry = {
			key,
			text,
			expires: Date.now() + CACHE_TTL_MS,
		};
		this.cache = entry;
		if (this.cacheMap.size >= CACHE_MAX) {
			const first = this.cacheMap.keys().next().value;
			if (first) {
				this.cacheMap.delete(first);
			}
		}
		this.cacheMap.set(key, entry);
	}

	private toItems(position: vscode.Position, insertText: string): vscode.InlineCompletionItem[] {
		return [
			{
				insertText,
				range: new vscode.Range(position, position),
			},
		];
	}
}
