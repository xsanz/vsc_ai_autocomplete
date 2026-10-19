import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import { log } from '../ui/output';
import { assembleRelatedTextWithMeta, dedupeRefsByName } from './related/budget';
import { discoverRelatedSymbols } from './related/discover';
import { discoverFileImports } from './related/discoverImports';
import { resolveDefinitionUri } from './related/lsp';
import { isVendorOrNodeModulesPath, resolveFallbackUri } from './related/resolveFallback';
import {
	emptyRelatedContext,
	type RelatedContextResult,
	type RelatedResolveSource,
	type RelatedResolvedEntry,
	type RelatedSkippedEntry,
	type RelatedSymbolRef,
} from './related/types';

export async function gatherRelatedContext(
	document: vscode.TextDocument,
	config: ExtensionConfig,
	token?: vscode.CancellationToken
): Promise<RelatedContextResult> {
	const empty = emptyRelatedContext();
	if (
		!config.includeRelatedContext ||
		config.relatedContextMaxChars <= 0 ||
		config.relatedContextMaxFiles <= 0 ||
		document.uri.scheme !== 'file'
	) {
		return empty;
	}

	if (!vscode.workspace.getWorkspaceFolder(document.uri)) {
		return empty;
	}

	const declarationRefs = discoverRelatedSymbols(document);
	const importRefs = config.relatedContextIncludeImports
		? discoverFileImports(document)
		: [];
	const refs = dedupeRefsByName([...declarationRefs, ...importRefs]).slice(
		0,
		config.relatedContextMaxFiles * (config.relatedContextIncludeImports ? 4 : 2)
	);
	if (refs.length === 0) {
		const msg = config.relatedContextIncludeImports
			? 'Related discovery: no declarations or file-level imports found'
			: 'Related discovery: no types on declaration lines (implements/extends)';
		log(msg, true);
		return empty;
	}

	const useLsp =
		config.relatedContextStrategy === 'auto' || config.relatedContextStrategy === 'lsp_only';
	const useHeuristic =
		config.relatedContextStrategy === 'auto' ||
		config.relatedContextStrategy === 'heuristic_only';

	const { resolved, skipped } = await resolveRefsToUris(
		document,
		refs,
		config.relatedContextMaxFiles,
		config.relatedContextAllowVendor,
		useLsp,
		useHeuristic,
		token
	);
	if (resolved.length === 0) {
		const names = refs.map((r) => r.name).join(', ');
		log(
			`Related discovery: found [${names}] but could not resolve workspace files (try LSP / language extension)`,
			true
		);
		return { ...empty, skipped };
	}

	const snippets: { relativePath: string; content: string }[] = [];
	const paths: string[] = [];
	const entries: RelatedResolvedEntry[] = [];
	for (const item of resolved) {
		if (token?.isCancellationRequested) {
			break;
		}
		try {
			const doc = await vscode.workspace.openTextDocument(item.uri);
			const relativePath = vscode.workspace.asRelativePath(item.uri);
			snippets.push({ relativePath, content: doc.getText() });
			paths.push(relativePath);
			entries.push({
				symbol: item.ref.name,
				relativePath,
				source: item.source,
			});
		} catch {
			skipped.push({ symbol: item.ref.name, reason: 'unresolved' });
		}
	}

	const rawCharTotal = snippets.reduce((sum, s) => sum + s.content.length, 0);
	const { text, truncated } = assembleRelatedTextWithMeta(
		snippets,
		config.relatedContextMaxChars
	);
	if (truncated || text.length < rawCharTotal) {
		log('Related context: truncated (maxChars)', true);
	}
	return { text, paths, entries, skipped };
}

interface ResolvedRef {
	uri: vscode.Uri;
	ref: RelatedSymbolRef;
	source: RelatedResolveSource;
}

async function resolveRefsToUris(
	document: vscode.TextDocument,
	refs: RelatedSymbolRef[],
	maxFiles: number,
	allowVendor: boolean,
	useLsp: boolean,
	useHeuristic: boolean,
	token?: vscode.CancellationToken
): Promise<{ resolved: ResolvedRef[]; skipped: RelatedSkippedEntry[] }> {
	const self = document.uri.toString();
	const seenUris = new Set<string>();
	const resolved: ResolvedRef[] = [];
	const skipped: RelatedSkippedEntry[] = [];

	for (const ref of refs) {
		if (token?.isCancellationRequested || resolved.length >= maxFiles) {
			break;
		}
		let uri: vscode.Uri | undefined;
		let source: RelatedResolveSource = 'heuristic';

		if (useLsp) {
			uri = await resolveDefinitionUri(document, ref.position);
			if (uri) {
				source = 'lsp';
			}
		}
		if (!uri && useHeuristic) {
			uri = await resolveFallbackUri(ref.name, document, allowVendor, token);
			if (uri) {
				source = 'heuristic';
			}
		}

		if (!uri) {
			skipped.push({ symbol: ref.name, reason: 'unresolved' });
			continue;
		}
		if (!allowVendor && isVendorOrNodeModulesPath(uri.fsPath)) {
			skipped.push({ symbol: ref.name, reason: 'vendor_disabled' });
			continue;
		}
		if (uri.toString() === self) {
			skipped.push({ symbol: ref.name, reason: 'same_file' });
			continue;
		}
		const key = uri.toString();
		if (seenUris.has(key)) {
			continue;
		}
		seenUris.add(key);
		resolved.push({ uri, ref, source });
	}

	return { resolved, skipped };
}
