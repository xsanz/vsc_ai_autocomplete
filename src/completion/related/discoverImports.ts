import * as vscode from 'vscode';
import type { RelatedSymbolRef } from './types';

const SCAN_MAX_LINES = 500;

/** PHP class import: `use FQCN;` or `use FQCN as Alias;` (not function/const/grouped). */
const PHP_USE_RE = /^\s*use\s+([\w\\]+)(?:\s+as\s+(\w+))?\s*;/;

/** Java/Kotlin style: `import pkg.Type;` */
const JAVA_IMPORT_RE = /^\s*import\s+(?:static\s+)?([\w.]+)\s*;/;

/** C#: `using Namespace.Type;` */
const CS_USING_RE = /^\s*using\s+(?:static\s+)?([\w.]+)\s*;/;

/** TS/JS: `import ... from 'module'` */
const TS_IMPORT_FROM_RE = /^\s*import\s+(?:type\s+)?(.+?)\s+from\s+['"][^'"]+['"]\s*;?/;

function getScanLines(document: vscode.TextDocument): string[] {
	const lineCount = Math.min(document.lineCount, SCAN_MAX_LINES);
	const lines: string[] = [];
	for (let i = 0; i < lineCount; i++) {
		lines.push(document.lineAt(i).text);
	}
	return lines;
}

export function discoverFileImports(document: vscode.TextDocument): RelatedSymbolRef[] {
	const lines = getScanLines(document);
	const refs: RelatedSymbolRef[] = [];
	for (let line = 0; line < lines.length; line++) {
		const text = lines[line];
		collectPhpUse(text, line, refs);
		collectJavaImport(text, line, refs);
		collectCsUsing(text, line, refs);
		collectTsImport(text, line, refs);
	}
	return dedupeImportRefs(refs);
}

function collectPhpUse(text: string, line: number, refs: RelatedSymbolRef[]): void {
	if (/^\s*use\s+(?:function|const)\s+/i.test(text)) {
		return;
	}
	const m = PHP_USE_RE.exec(text);
	if (!m) {
		return;
	}
	const fqcn = m[1];
	const alias = m[2];
	const shortName = alias ?? (fqcn.split('\\').pop() ?? fqcn);
	const char = positionOfSymbolOnLine(text, shortName, alias ? m.index + m[0].indexOf(alias) : undefined);
	if (char < 0) {
		return;
	}
	refs.push({
		name: shortName,
		position: new vscode.Position(line, char),
		kind: 'import',
	});
}

function collectJavaImport(text: string, line: number, refs: RelatedSymbolRef[]): void {
	const m = JAVA_IMPORT_RE.exec(text);
	if (!m) {
		return;
	}
	const fqcn = m[1];
	const shortName = fqcn.split('.').pop() ?? fqcn;
	const char = positionOfSymbolOnLine(text, shortName);
	if (char < 0) {
		return;
	}
	refs.push({
		name: shortName,
		position: new vscode.Position(line, char),
		kind: 'import',
	});
}

function collectCsUsing(text: string, line: number, refs: RelatedSymbolRef[]): void {
	const m = CS_USING_RE.exec(text);
	if (!m) {
		return;
	}
	const fqcn = m[1];
	const shortName = fqcn.split('.').pop() ?? fqcn;
	const char = positionOfSymbolOnLine(text, shortName);
	if (char < 0) {
		return;
	}
	refs.push({
		name: shortName,
		position: new vscode.Position(line, char),
		kind: 'import',
	});
}

function collectTsImport(text: string, line: number, refs: RelatedSymbolRef[]): void {
	const m = TS_IMPORT_FROM_RE.exec(text);
	if (!m) {
		return;
	}
	const clause = m[1].trim();
	const names = extractTsImportNames(clause);
	for (const name of names) {
		const char = positionOfSymbolOnLine(text, name);
		if (char < 0) {
			continue;
		}
		refs.push({
			name,
			position: new vscode.Position(line, char),
			kind: 'import',
		});
	}
}

function extractTsImportNames(clause: string): string[] {
	if (clause.startsWith('{')) {
		const inner = clause.replace(/^\{/, '').replace(/\}.*$/, '');
		return inner
			.split(',')
			.map((p) => {
				const t = p.trim();
				const asParts = t.split(/\s+as\s+/);
				return (asParts[1] ?? asParts[0]).trim();
			})
			.filter(Boolean);
	}
	if (clause.startsWith('*')) {
		return [];
	}
	const defaultMatch = /^(?:type\s+)?(\w+)/.exec(clause);
	return defaultMatch ? [defaultMatch[1]] : [];
}

function positionOfSymbolOnLine(lineText: string, symbol: string, hintIndex?: number): number {
	if (hintIndex !== undefined && hintIndex >= 0) {
		return hintIndex;
	}
	const re = new RegExp(`\\b${escapeRegExp(symbol)}\\b`);
	const m = re.exec(lineText);
	return m ? m.index : -1;
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dedupeImportRefs(refs: RelatedSymbolRef[]): RelatedSymbolRef[] {
	const seen = new Set<string>();
	const out: RelatedSymbolRef[] = [];
	for (const r of refs) {
		const key = r.name;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		out.push(r);
	}
	return out;
}

/** For unit tests. */
export function discoverFileImportsInText(text: string): RelatedSymbolRef[] {
	const lines = text.split('\n');
	const doc = {
		lineCount: lines.length,
		lineAt(line: number): { text: string } {
			return { text: lines[line] ?? '' };
		},
	} as vscode.TextDocument;
	return discoverFileImports(doc);
}
