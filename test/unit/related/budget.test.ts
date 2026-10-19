import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	assembleRelatedText,
	dedupeRefsByName,
	sortRefsByPriority,
} from '../../../src/completion/related/budget';
import type { RelatedSymbolRef } from '../../../src/completion/related/types';

describe('sortRefsByPriority', () => {
	it('orders implements before extends', () => {
		const refs: RelatedSymbolRef[] = [
			{ name: 'B', position: { line: 0, character: 0 } as never, kind: 'extends' },
			{ name: 'A', position: { line: 0, character: 0 } as never, kind: 'implements' },
		];
		const sorted = sortRefsByPriority(refs);
		assert.equal(sorted[0].name, 'A');
	});

	it('dedupeRefsByName keeps extends over import for same name', () => {
		const refs: RelatedSymbolRef[] = [
			{ name: 'Model', position: { line: 1, character: 0 } as never, kind: 'import' },
			{ name: 'Model', position: { line: 0, character: 0 } as never, kind: 'extends' },
		];
		const deduped = dedupeRefsByName(refs);
		assert.equal(deduped.length, 1);
		assert.equal(deduped[0].kind, 'extends');
	});

	it('orders extends before import', () => {
		const refs: RelatedSymbolRef[] = [
			{ name: 'M', position: { line: 0, character: 0 } as never, kind: 'import' },
			{ name: 'M', position: { line: 0, character: 0 } as never, kind: 'extends' },
		];
		const sorted = sortRefsByPriority(refs);
		assert.equal(sorted[0].kind, 'extends');
	});
});

describe('assembleRelatedText', () => {
	it('truncates to maxChars', () => {
		const text = assembleRelatedText(
			[{ relativePath: 'a.ts', content: 'x'.repeat(100) }],
			30
		);
		assert.ok(text.length <= 30);
		assert.match(text, /^\/\/ File: a\.ts/);
	});

	it('joins multiple files', () => {
		const text = assembleRelatedText(
			[
				{ relativePath: 'a.ts', content: 'one' },
				{ relativePath: 'b.ts', content: 'two' },
			],
			500
		);
		assert.match(text, /a\.ts/);
		assert.match(text, /b\.ts/);
	});
});
