import * as vscode from 'vscode';
import type { RelatedContextLogInput } from './relatedContextLog';
import { buildRelatedContextLogLines } from './relatedContextLog';
import { simpleHash } from '../util/hash';

const CHANNEL_NAME = 'Local AI Autocomplete';
const SNIPPET_MAX = 200;

let channel: vscode.OutputChannel | undefined;
let authErrorLoggedThisSession = false;

export function getOutputChannel(): vscode.OutputChannel {
	if (!channel) {
		channel = vscode.window.createOutputChannel(CHANNEL_NAME);
	}
	return channel;
}

export function resetAuthErrorSessionFlag(): void {
	authErrorLoggedThisSession = false;
}

export function logAuthErrorOnce(message: string): void {
	if (authErrorLoggedThisSession) {
		return;
	}
	authErrorLoggedThisSession = true;
	getOutputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function log(message: string, debugOnly = false): void {
	const cfg = vscode.workspace.getConfiguration('localAiAutocomplete');
	if (debugOnly && !cfg.get<boolean>('debug', false)) {
		return;
	}
	getOutputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function logContextDebug(prefix: string, suffix: string): void {
	const cfg = vscode.workspace.getConfiguration('localAiAutocomplete');
	if (!cfg.get<boolean>('debug', false)) {
		log(
			`Context prefix=${prefix.length} chars (hash ${simpleHash(prefix)}), suffix=${suffix.length} chars (hash ${simpleHash(suffix)})`,
			true
		);
		return;
	}
	const pSnip =
		prefix.length <= SNIPPET_MAX
			? prefix
			: '…' + prefix.slice(-SNIPPET_MAX);
	const sSnip =
		suffix.length <= SNIPPET_MAX ? suffix : suffix.slice(0, SNIPPET_MAX) + '…';
	log(
		`Context prefix(${prefix.length}): ${JSON.stringify(pSnip)} suffix(${suffix.length}): ${JSON.stringify(sSnip)}`
	);
}

export type { RelatedContextLogInput } from './relatedContextLog';

export function logRelatedContextDebug(input: RelatedContextLogInput): void {
	const cfg = vscode.workspace.getConfiguration('localAiAutocomplete');
	const debug = cfg.get<boolean>('debug', false);
	const lines = buildRelatedContextLogLines({ ...input, debug });

	for (const line of lines) {
		const debugOnly =
			line.startsWith('Related context: none') || line.startsWith('Related context:');
		if (debugOnly) {
			log(line, true);
		} else {
			log(line);
		}
	}
}

export interface FimPayloadLogSizes {
	fimMode: string;
	promptChars: number;
	apiSuffixChars: number;
	chatUserChars: number;
}

export function logFimPayloadDebug(sizes: FimPayloadLogSizes): void {
	if (sizes.fimMode === 'chat_pseudo_fim') {
		log(
			`API payload (${sizes.fimMode}): chat user message ${sizes.chatUserChars} chars`,
			true
		);
		return;
	}
	const suffixPart =
		sizes.apiSuffixChars > 0 ? `, API suffix ${sizes.apiSuffixChars} chars` : '';
	log(
		`API payload (${sizes.fimMode}): prompt ${sizes.promptChars} chars${suffixPart}`,
		true
	);
}
