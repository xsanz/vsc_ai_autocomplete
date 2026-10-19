import * as vscode from 'vscode';
import type { ExtensionConfig } from '../config';
import { log } from '../ui/output';
import { assembleRelatedText, sortRefsByPriority } from './related/budget';
import { discoverRelatedSymbols } from './related/discover';
import { resolveDefinitionUri } from './related/lsp';
import { resolveFallbackUri } from './related/resolveFallback';
import type { RelatedContextResult, RelatedSymbolRef } from './related/types';

export async function gatherRelatedContext(
	document: vscode.TextDocument,
	config: ExtensionConfig,
	token?: vscode.CancellationToken
): Promise<RelatedContextResult> {
	const empty: RelatedContextResult = { text: '', paths: [] };
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

	const refs = sortRefsByPriority(discoverRelatedSymbols(document)).slice(
		0,
		config.relatedContextMaxFiles * 2
	);
	if (refs.length === 0) {
		log('Related discovery: no types on declaration lines (implements/extends)', true);
		return empty;
	}

	const useLsp =
		config.relatedContextStrategy === 'auto' || config.relatedContextStrategy === 'lsp_only';
	const useHeuristic =
		config.relatedContextStrategy === 'auto' ||
		config.relatedContextStrategy === 'heuristic_only';

	const resolved = await resolveRefsToUris(
		document,
		refs,
		config.relatedContextMaxFiles,
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
		return empty;
	}

	const snippets: { relativePath: string; content: string }[] = [];
	const paths: string[] = [];

	for (const { uri } of resolved) {
		if (token?.isCancellationRequested) {
			break;
		}
		try {
			const doc = await vscode.workspace.openTextDocument(uri);
			const relativePath = vscode.workspace.asRelativePath(uri);
			snippets.push({ relativePath, content: doc.getText() });
			paths.push(relativePath);
		} catch {
			/* skip */
		}
	}

	const text = assembleRelatedText(snippets, config.relatedContextMaxChars);
	return { text, paths };
}

async function resolveRefsToUris(
	document: vscode.TextDocument,
	refs: RelatedSymbolRef[],
	maxFiles: number,
	useLsp: boolean,
	useHeuristic: boolean,
	token?: vscode.CancellationToken
): Promise<Array<{ uri: vscode.Uri; ref: RelatedSymbolRef }>> {
	const self = document.uri.toString();
	const seenUris = new Set<string>();
	const out: Array<{ uri: vscode.Uri; ref: RelatedSymbolRef }> = [];

	for (const ref of refs) {
		if (token?.isCancellationRequested || out.length >= maxFiles) {
			break;
		}
		let uri: vscode.Uri | undefined;
		if (useLsp) {
			uri = await resolveDefinitionUri(document, ref.position);
		}
		if (!uri && useHeuristic) {
			uri = await resolveFallbackUri(ref.name, document, token);
		}
		if (!uri || uri.toString() === self) {
			continue;
		}
		const key = uri.toString();
		if (seenUris.has(key)) {
			continue;
		}
		seenUris.add(key);
		out.push({ uri, ref });
	}

	return out;
}
