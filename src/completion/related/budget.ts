import type { RelatedSymbolKind, RelatedSymbolRef } from './types';

const KIND_PRIORITY: Record<RelatedSymbolKind, number> = {
	implements: 0,
	extends: 1,
	inherits: 2,
	other: 3,
};

export function sortRefsByPriority(refs: RelatedSymbolRef[]): RelatedSymbolRef[] {
	return [...refs].sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
}

export interface FileSnippet {
	relativePath: string;
	content: string;
}

export function assembleRelatedText(snippets: FileSnippet[], maxChars: number): string {
	let remaining = maxChars;
	const parts: string[] = [];
	for (const snip of snippets) {
		const header = `// File: ${snip.relativePath}\n`;
		const budget = remaining - header.length;
		if (budget <= 0) {
			break;
		}
		const body =
			snip.content.length <= budget ? snip.content : snip.content.slice(0, budget) + '\n…';
		parts.push(header + body);
		remaining -= header.length + body.length;
	}
	const joined = parts.join('\n\n');
	return joined.length <= maxChars ? joined : joined.slice(0, maxChars);
}
