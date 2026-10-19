import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { postProcessCompletion } from '../../src/completion/postprocess';

describe('postProcessCompletion', () => {
	it('applies stop sequences', () => {
		const r = postProcessCompletion('foo\n\nbar', '', '', ['\n\n'], 128);
		assert.equal(r, 'foo');
	});

	it('trims suffix overlap', () => {
		const r = postProcessCompletion('helloworld', '', 'world', [], 128);
		assert.equal(r, 'hello');
	});

	it('clips when middle contains suffix', () => {
		const r = postProcessCompletion('insert);}', '', ');}', [], 128);
		assert.equal(r, 'insert');
	});
});
