import type {
	RelatedResolvedEntry,
	RelatedSkippedEntry,
} from '../completion/related/types';

export interface RelatedContextLogInput {
	strategy: string;
	charCount: number;
	text: string;
	entries: RelatedResolvedEntry[];
	skipped: RelatedSkippedEntry[];
	debug: boolean;
}

export function formatRelatedPathsSummary(
	entries: RelatedResolvedEntry[],
	includeSource: boolean
): string {
	if (entries.length === 0) {
		return '';
	}
	if (includeSource) {
		return entries.map((e) => `${e.relativePath} (${e.source})`).join(', ');
	}
	return entries.map((e) => e.relativePath).join(', ');
}

/** Build log lines for related context (testable without VS Code output channel). */
export function buildRelatedContextLogLines(input: RelatedContextLogInput): string[] {
	const lines: string[] = [];
	const hasFiles = input.entries.length > 0;

	if (!hasFiles) {
		lines.push('Related context: none');
		return lines;
	}

	const pathSummary = formatRelatedPathsSummary(input.entries, input.debug);
	lines.push(
		`Related context: ${input.entries.length} file(s), ${input.charCount} chars — ${pathSummary}`
	);

	if (!input.debug) {
		return lines;
	}

	lines.unshift(`Related resolution strategy: ${input.strategy}`);

	for (const e of input.entries) {
		lines.push(`Related resolve: ${e.symbol} → ${e.relativePath} (${e.source})`);
	}
	for (const s of input.skipped) {
		let reason = 'unresolved or excluded';
		if (s.reason === 'same_file') {
			reason = 'same file';
		} else if (s.reason === 'vendor_disabled') {
			reason = 'vendor disabled';
		}
		lines.push(`Related resolve: ${s.symbol} → skipped (${reason})`);
	}

	if (input.text.length > 0) {
		const snip =
			input.text.length <= 200 ? input.text : input.text.slice(0, 200) + '…';
		lines.push(`Related context snippet: ${JSON.stringify(snip)}`);
	}

	return lines;
}
