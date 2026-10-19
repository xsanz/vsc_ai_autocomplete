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
		parseClauseAfterKeyword(m[0], m.index, 'implements', 'implements', document, refs);
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
		parseClauseAfterKeyword(m[0], m.index, 'extends', 'extends', document, refs);
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
		const colonRe = /:\s*/;
		const cm = colonRe.exec(m[0]);
		if (!cm) {
			continue;
		}
		let rest = m[0].slice(cm.index + cm[0].length);
		rest = rest.replace(/\s*\{[\s\S]*$/, '').replace(/\s+where\b[\s\S]*$/, '').trim();
		const clauseDocOffset = m.index + cm.index + cm[0].length;
		addNamesFromClauseText(rest, clauseDocOffset, 'inherits', document, refs);
	}
}

function parseClauseAfterKeyword(
	fullMatch: string,
	matchIndex: number,
	keyword: 'extends' | 'implements',
	kind: RelatedSymbolKind,
	document: vscode.TextDocument,
	refs: RelatedSymbolRef[]
): void {
	const re = new RegExp(`\\b${keyword}\\s+`);
	const km = re.exec(fullMatch);
	if (!km) {
		return;
	}
	let rest = fullMatch.slice(km.index + km[0].length);
	if (keyword === 'extends') {
		rest = rest.replace(/\s+implements[\s\S]*$/, '');
	}
	rest = rest.replace(/\s*\{[\s\S]*$/, '').trim();
	const clauseDocOffset = matchIndex + km.index + km[0].length;
	addNamesFromClauseText(rest, clauseDocOffset, kind, document, refs);
}

function addNamesFromClauseText(
	clause: string,
	clauseDocOffset: number,
	kind: RelatedSymbolKind,
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
		const nameRe = new RegExp(`\\b${escapeRegExp(shortName)}\\b`, 'g');
		nameRe.lastIndex = searchFrom;
		const nm = nameRe.exec(clause);
		if (!nm) {
			continue;
		}
		searchFrom = nm.index + shortName.length;
		const offset = clauseDocOffset + nm.index;
		refs.push({
			name: shortName,
			position: document.positionAt(offset),
			kind,
		});
	}
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
