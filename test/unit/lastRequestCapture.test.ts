import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	clearLastCapturedRequest,
	formatCurlWithPayloadFile,
	lastRequestBodyJson,
	setLastCapturedRequest,
	type CapturedApiRequest,
} from '../../src/api/lastRequestCapture';

describe('formatCurlWithPayloadFile', () => {
	const captured: CapturedApiRequest = {
		baseUrl: 'http://127.0.0.1:1234/v1',
		path: '/completions',
		url: 'http://127.0.0.1:1234/v1/completions',
		body: { model: 'x', prompt: 'secret-code' },
		capturedAt: '2020-01-01T00:00:00.000Z',
		fimMode: 'completions_suffix',
	};

	it('never embeds a caller-supplied secret', () => {
		const curl = formatCurlWithPayloadFile(captured, 'local-ai-last-completions-payload.json');
		const leakedSecret = 'sk-super-secret-test-key-12345';
		assert.doesNotMatch(curl, new RegExp(leakedSecret));
		assert.match(curl, /LOCAL_AI_API_KEY/);
		assert.match(curl, /YOUR_API_KEY/);
	});

	it('uses payload file reference', () => {
		const curl = formatCurlWithPayloadFile(captured, 'local-ai-last-completions-payload.json');
		assert.match(curl, /@local-ai-last-completions-payload\.json/);
	});
});

describe('lastRequestBodyJson', () => {
	it('body JSON has no authorization field', () => {
		clearLastCapturedRequest();
		setLastCapturedRequest('http://127.0.0.1/v1', '/completions', { model: 'm', prompt: 'p' }, 'completions');
		const json = lastRequestBodyJson(true);
		assert.ok(json);
		assert.doesNotMatch(json!, /authorization/i);
		clearLastCapturedRequest();
	});
});
