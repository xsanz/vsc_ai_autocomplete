import * as vscode from 'vscode';

export type RelatedSymbolKind = 'implements' | 'extends' | 'inherits' | 'import' | 'other';

export type RelatedResolveSource = 'lsp' | 'heuristic';

export type RelatedSkippedReason = 'unresolved' | 'same_file' | 'vendor_disabled';

export interface RelatedSymbolRef {
	name: string;
	position: vscode.Position;
	kind: RelatedSymbolKind;
}

export interface RelatedResolvedEntry {
	symbol: string;
	relativePath: string;
	source: RelatedResolveSource;
}

export interface RelatedSkippedEntry {
	symbol: string;
	reason: RelatedSkippedReason;
}

export interface RelatedContextResult {
	text: string;
	paths: string[];
	entries: RelatedResolvedEntry[];
	skipped: RelatedSkippedEntry[];
}

export function emptyRelatedContext(): RelatedContextResult {
	return { text: '', paths: [], entries: [], skipped: [] };
}
