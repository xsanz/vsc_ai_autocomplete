import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	buildChatBody,
	buildCompletionsBody,
	CHAT_PSEUDO_FIM_SYSTEM,
	parseChatResponse,
	parseCompletionsResponse,
} from '../../src/api/fim';
import type { ExtensionConfig } from '../../src/config';

function baseConfig(overrides: Partial<ExtensionConfig> = {}): ExtensionConfig {
	return {
		enabled: true,
		baseUrl: 'http://127.0.0.1:1234/v1',
		model: 'test-model',
		maxTokens: 128,
		temperature: 0.2,
		debounceMs: 300,
		requestTimeoutMs: 15000,
		prefixMaxChars: 8192,
		suffixMaxChars: 4096,
		fimMode: 'completions_suffix',
		fimTemplate: '<PRE>{prefix}<SUF>{suffix}<MID>',
		stop: ['\n\n'],
		languages: [],
		debug: false,
		...overrides,
	};
}

describe('buildCompletionsBody', () => {
	it('completions_suffix uses prompt and suffix', () => {
		const body = buildCompletionsBody({
			prefix: 'pre',
			suffix: 'suf',
			config: baseConfig({ fimMode: 'completions_suffix' }),
		});
		assert.equal(body.prompt, 'pre');
		assert.equal(body.suffix, 'suf');
		assert.equal(body.stream, false);
		assert.equal(body.model, 'test-model');
		assert.notEqual(body.prompt, undefined);
		assert.equal('suffix' in body, true);
	});

	it('completions uses prompt only (no suffix field)', () => {
		const body = buildCompletionsBody({
			prefix: 'pre',
			suffix: 'suf',
			config: baseConfig({ fimMode: 'completions' }),
		});
		assert.equal(body.prompt, 'pre');
		assert.equal('suffix' in body, false);
	});

	it('template omits suffix field', () => {
		const body = buildCompletionsBody({
			prefix: 'A',
			suffix: 'B',
			config: baseConfig({ fimMode: 'template' }),
		});
		assert.equal(body.prompt, '<PRE>A<SUF>B<MID>');
		assert.equal('suffix' in body, false);
	});
});

describe('buildChatBody', () => {
	it('includes system message and fenced prefix/suffix', () => {
		const body = buildChatBody({
			prefix: 'x',
			suffix: 'y',
			config: baseConfig({ fimMode: 'chat_pseudo_fim' }),
		});
		const messages = body.messages as Array<{ role: string; content: string }>;
		assert.equal(messages[0].role, 'system');
		assert.equal(messages[0].content, CHAT_PSEUDO_FIM_SYSTEM);
		assert.match(messages[1].content, /before-cursor/);
		assert.match(messages[1].content, /after-cursor/);
	});
});

describe('parse responses', () => {
	it('parseCompletionsResponse', () => {
		assert.equal(parseCompletionsResponse({ choices: [{ text: 'mid' }] }), 'mid');
		assert.equal(parseCompletionsResponse({ choices: [] }), undefined);
		assert.equal(parseCompletionsResponse({}), undefined);
	});

	it('parseChatResponse', () => {
		assert.equal(
			parseChatResponse({ choices: [{ message: { content: 'hi' } }] }),
			'hi'
		);
		assert.equal(parseChatResponse({ choices: [{}] }), undefined);
	});
});
