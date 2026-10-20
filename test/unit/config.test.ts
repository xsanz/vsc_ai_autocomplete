import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateBaseUrl } from '../../src/config';

describe('validateBaseUrl', () => {
	it('accepts http and https', () => {
		assert.equal(validateBaseUrl('http://127.0.0.1:1234/v1'), undefined);
		assert.equal(validateBaseUrl('https://api.example.com/v1'), undefined);
	});

	it('rejects empty', () => {
		const err = validateBaseUrl('');
		assert.ok(err);
		assert.match(err, /empty/);
	});

	it('rejects non-http schemes', () => {
		const fileErr = validateBaseUrl('file:///etc/passwd');
		assert.ok(fileErr);
		assert.match(fileErr, /http or https/);
		const jsErr = validateBaseUrl('javascript:alert(1)');
		assert.ok(jsErr);
		assert.match(jsErr, /http or https/);
	});

	it('rejects single quotes in URL', () => {
		const err = validateBaseUrl("http://evil.com/'");
		assert.ok(err);
		assert.match(err, /single quotes/);
	});

	it('rejects invalid URL', () => {
		const err = validateBaseUrl('not a url');
		assert.ok(err);
		assert.match(err, /Invalid baseUrl/);
	});
});
