import * as vscode from 'vscode';
import type { RelatedSymbolKind, RelatedSymbolRef } from './types';

const SCAN_MAX_LINES = 500;

const IMPLEMENTS_RE =
	/\b(?:(?:final|abstract)\s+)?(?:class|struct|record|interface)\s+[\w.]+\s+(?:extends\s+[\w\\.]+\s+)?implements\s+([\w\s,.\\]+?)(?=\s*\{|\s*$)/gi;
const EXTENDS_RE =
	/\b(?:(?:final|abstract)\s+)?(?:class|struct|record|interface)\s+([\w.]+)\s+extends\s+([\w\s,.\\]+?)(?=\s+implements|\s*\{|\s*$)/gi;
const INHERITS_RE =
	/\b(?:class|struct|record)\s+[\w.]+\s*:\s*([\w\s,.]+?)(?=\s*\{|\s+where\b|\s*$)/gi;

function getScanText(document: vscode.TextDocument): string {
	const lineCount = Math.min(document.lineCount, SCAN_MAX_LINES);
	const lines: string[] = [];
	for (let i = 0; i < lineCount; i++) {
		lines.push(document.lineAt(i).text);
	}
	return lines.join('\n');
}

export function discoverRelatedSymbols(
	document: vscode.TextDocument
): RelatedSymbolRef[] {
	const header = getScanText(document);
	const refs: RelatedSymbolRef[] = [];

	collectFromImplements(header, document, refs);
	collectFromExtends(header, document, refs);
	collectFromInherits(header, document, refs);

	return dedupeRefs(refs);
}

function collectFromImplements(
	text: string,
	document: vscode.TextDocument,
	refs: RelatedSymbolRef[]
): void {
	IMPLEMENTS_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = IMPLEMENTS_RE.exec(text)) !== null) {
		addNamesFromClause(m[1], 'implements', m.index, m[0], document, refs);
	}
}

function collectFromExtends(
	text: string,
	document: vscode.TextDocument,
	refs: RelatedSymbolRef[]
): void {
	EXTENDS_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = EXTENDS_RE.exec(text)) !== null) {
		addNamesFromClause(m[2], 'extends', m.index, m[0], document, refs);
	}
}

function collectFromInherits(
	text: string,
	document: vscode.TextDocument,
	refs: RelatedSymbolRef[]
): void {
	INHERITS_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = INHERITS_RE.exec(text)) !== null) {
		addNamesFromClause(m[1], 'inherits', m.index, m[0], document, refs);
	}
}

function addNamesFromClause(
	clause: string,
	kind: RelatedSymbolKind,
	matchIndex: number,
	matchText: string,
	document: vscode.TextDocument,
	refs: RelatedSymbolRef[]
): void {
	let searchFrom = 0;
	for (const part of clause.split(',')) {
		const name = part.trim().split(/\s+/)[0]?.replace(/^:+/, '');
		if (!name || !/^[\w.\\]+$/.test(name)) {
			continue;
		}
		const shortName =
			name.includes('\\') ? (name.split('\\').pop() ?? name) : (name.split('.').pop() ?? name);
		const nameOffsetInMatch = matchText.indexOf(shortName, searchFrom);
		if (nameOffsetInMatch < 0) {
			continue;
		}
		searchFrom = nameOffsetInMatch + shortName.length;
		const offset = matchIndex + nameOffsetInMatch;
		refs.push({
			name: shortName,
			position: document.positionAt(offset),
			kind,
		});
	}
}

function dedupeRefs(refs: RelatedSymbolRef[]): RelatedSymbolRef[] {
	const seen = new Set<string>();
	const out: RelatedSymbolRef[] = [];
	for (const r of refs) {
		const key = `${r.kind}:${r.name}`;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		out.push(r);
	}
	return out;
}

/** For unit tests: build a one-buffer fake document. */
export function discoverRelatedSymbolsInText(text: string): RelatedSymbolRef[] {
	const lines = text.split('\n');
	const lineStarts: number[] = [];
	let pos = 0;
	for (const line of lines) {
		lineStarts.push(pos);
		pos += line.length + 1;
	}
	const doc = {
		lineCount: lines.length,
		lineAt(line: number): { text: string } {
			return { text: lines[line] ?? '' };
		},
		positionAt(offset: number): vscode.Position {
			for (let i = lines.length - 1; i >= 0; i--) {
				if (offset >= lineStarts[i]) {
					return { line: i, character: offset - lineStarts[i] } as vscode.Position;
				}
			}
			return { line: 0, character: offset } as vscode.Position;
		},
	} as vscode.TextDocument;
	return discoverRelatedSymbols(doc);
}
