import type { RelatedSymbolKind, RelatedSymbolRef } from './types';

const KIND_PRIORITY: Record<RelatedSymbolKind, number> = {
	implements: 0,
	extends: 1,
	inherits: 2,
	import: 3,
	other: 4,
};

export function sortRefsByPriority(refs: RelatedSymbolRef[]): RelatedSymbolRef[] {
	return [...refs].sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
}

/** One ref per symbol name, keeping the highest-priority kind. */
export function dedupeRefsByName(refs: RelatedSymbolRef[]): RelatedSymbolRef[] {
	const sorted = sortRefsByPriority(refs);
	const seen = new Set<string>();
	const out: RelatedSymbolRef[] = [];
	for (const r of sorted) {
		if (seen.has(r.name)) {
			continue;
		}
		seen.add(r.name);
		out.push(r);
	}
	return out;
}

export interface FileSnippet {
	relativePath: string;
	content: string;
}

export interface AssembleRelatedResult {
	text: string;
	truncated: boolean;
}

export function assembleRelatedText(snippets: FileSnippet[], maxChars: number): string {
	return assembleRelatedTextWithMeta(snippets, maxChars).text;
}

export function assembleRelatedTextWithMeta(
	snippets: FileSnippet[],
	maxChars: number
): AssembleRelatedResult {
	let remaining = maxChars;
	const parts: string[] = [];
	let truncated = false;
	const rawTotal = snippets.reduce(
		(sum, s) => sum + s.content.length + `// File: ${s.relativePath}\n`.length + 2,
		0
	);
	for (const snip of snippets) {
		const header = `// File: ${snip.relativePath}\n`;
		const budget = remaining - header.length;
		if (budget <= 0) {
			truncated = true;
			break;
		}
		if (snip.content.length > budget) {
			truncated = true;
		}
		const body =
			snip.content.length <= budget ? snip.content : snip.content.slice(0, budget) + '\n…';
		parts.push(header + body);
		remaining -= header.length + body.length;
	}
	const joined = parts.join('\n\n');
	const text = joined.length <= maxChars ? joined : joined.slice(0, maxChars);
	if (rawTotal > maxChars) {
		truncated = true;
	}
	return { text, truncated };
}
