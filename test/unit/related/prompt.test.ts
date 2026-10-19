import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	appendRelatedToChatUserMessage,
	CURRENT_FILE_HEADER,
	RELATED_CONTEXT_HEADER,
	wrapPrefixWithRelatedContext,
} from '../../../src/completion/related/prompt';

describe('wrapPrefixWithRelatedContext', () => {
	it('returns prefix when related empty', () => {
		assert.equal(wrapPrefixWithRelatedContext('', 'abc'), 'abc');
		assert.equal(wrapPrefixWithRelatedContext('  \n', 'abc'), 'abc');
	});

	it('wraps non-empty related', () => {
		const out = wrapPrefixWithRelatedContext('// File: a.ts\n', 'code');
		assert.ok(out.includes(RELATED_CONTEXT_HEADER));
		assert.ok(out.includes(CURRENT_FILE_HEADER));
		assert.match(out, /code$/);
	});
});

describe('appendRelatedToChatUserMessage', () => {
	it('unchanged when no related', () => {
		assert.equal(appendRelatedToChatUserMessage('', 'user'), 'user');
	});

	it('prepends related fence', () => {
		const out = appendRelatedToChatUserMessage('iface', 'user');
		assert.match(out, /```related/);
		assert.match(out, /iface/);
		assert.match(out, /user$/);
	});
});
