import * as vscode from 'vscode';

export type RelatedSymbolKind = 'implements' | 'extends' | 'inherits' | 'other';

export interface RelatedSymbolRef {
	name: string;
	position: vscode.Position;
	kind: RelatedSymbolKind;
}

export interface RelatedContextResult {
	text: string;
	paths: string[];
}
