import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assembleRelatedText, sortRefsByPriority } from '../../../src/completion/related/budget';
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
