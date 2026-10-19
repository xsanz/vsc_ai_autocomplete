import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractPrefixSuffixFromText } from '../../src/completion/context';

describe('extractPrefixSuffixFromText', () => {
	it('splits at offset', () => {
		const r = extractPrefixSuffixFromText('abcdef', 3, 100, 100);
		assert.equal(r.prefix, 'abc');
		assert.equal(r.suffix, 'def');
	});

	it('truncates prefix from the left', () => {
		const r = extractPrefixSuffixFromText('0123456789', 10, 4, 100);
		assert.equal(r.prefix, '6789');
		assert.equal(r.suffix, '');
	});

	it('truncates suffix from the right', () => {
		const r = extractPrefixSuffixFromText('0123456789', 0, 100, 4);
		assert.equal(r.prefix, '');
		assert.equal(r.suffix, '0123');
	});

	it('clamps offset', () => {
		const r = extractPrefixSuffixFromText('ab', 99, 100, 100);
		assert.equal(r.prefix, 'ab');
		assert.equal(r.suffix, '');
	});
});
