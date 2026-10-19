import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	buildRelatedContextLogLines,
	formatRelatedPathsSummary,
} from '../../../src/ui/relatedContextLog';

describe('formatRelatedPathsSummary', () => {
	const entries = [
		{ symbol: 'I', relativePath: 'app/I.php', source: 'lsp' as const },
	];

	it('omits source when not debug', () => {
		assert.equal(formatRelatedPathsSummary(entries, false), 'app/I.php');
	});

	it('includes source when debug', () => {
		assert.equal(formatRelatedPathsSummary(entries, true), 'app/I.php (lsp)');
	});
});

describe('buildRelatedContextLogLines', () => {
	it('none when no entries', () => {
		const lines = buildRelatedContextLogLines({
			strategy: 'auto',
			charCount: 0,
			text: '',
			entries: [],
			skipped: [],
			debug: true,
		});
		assert.deepEqual(lines, ['Related context: none']);
	});

	it('summary without source tags when debug off', () => {
		const lines = buildRelatedContextLogLines({
			strategy: 'auto',
			charCount: 100,
			text: '',
			entries: [
				{ symbol: 'I', relativePath: 'app/I.php', source: 'heuristic' },
			],
			skipped: [],
			debug: false,
		});
		assert.equal(lines.length, 1);
		assert.match(lines[0], /app\/I\.php/);
		assert.doesNotMatch(lines[0], /\(heuristic\)/);
	});

	it('strategy and per-symbol lines when debug on', () => {
		const lines = buildRelatedContextLogLines({
			strategy: 'auto',
			charCount: 100,
			text: 'x',
			entries: [
				{ symbol: 'I', relativePath: 'app/I.php', source: 'lsp' },
			],
			skipped: [{ symbol: 'Model', reason: 'unresolved' }],
			debug: true,
		});
		assert.ok(lines.some((l) => l.includes('Related resolution strategy: auto')));
		assert.ok(lines.some((l) => l.includes('app/I.php (lsp)')));
		assert.ok(lines.some((l) => l.includes('I → app/I.php (lsp)')));
		assert.ok(lines.some((l) => l.includes('Model → skipped')));
	});

	it('vendor_disabled skip reason', () => {
		const lines = buildRelatedContextLogLines({
			strategy: 'auto',
			charCount: 0,
			text: '',
			entries: [],
			skipped: [{ symbol: 'Model', reason: 'vendor_disabled' }],
			debug: true,
		});
		assert.ok(lines.some((l) => l.includes('vendor disabled')));
	});
});
