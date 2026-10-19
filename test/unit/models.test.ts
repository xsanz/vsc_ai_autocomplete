import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelsResponse } from '../../src/api/models';

describe('parseModelsResponse', () => {
	it('parses OpenAI / vLLM data[].id', () => {
		const models = parseModelsResponse({
			object: 'list',
			data: [{ id: 'nvidia/Qwen3.8-Flash-Next-FP4-Local', object: 'model' }],
		});
		assert.deepEqual(models.map((m) => m.id), ['nvidia/Qwen3.8-Flash-Next-FP4-Local']);
	});

	it('parses string models array', () => {
		const models = parseModelsResponse({ models: ['a', 'b'] });
		assert.deepEqual(models.map((m) => m.id), ['a', 'b']);
	});
});
