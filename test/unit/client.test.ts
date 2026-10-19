import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApiUrl } from '../../src/api/client';

describe('buildApiUrl', () => {
	it('appends path under /v1 base', () => {
		assert.equal(
			buildApiUrl('http://127.0.0.1:1234/v1', '/models'),
			'http://127.0.0.1:1234/v1/models'
		);
	});

	it('trims trailing slash on base', () => {
		assert.equal(
			buildApiUrl('http://127.0.0.1:1234/v1/', 'completions'),
			'http://127.0.0.1:1234/v1/completions'
		);
	});
});
