import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	buildChatBody,
	buildCompletionsBody,
	buildFimHttpRequest,
	CHAT_PSEUDO_FIM_SYSTEM,
	fimRequestPayloadSizes,
	parseChatResponse,
	parseCompletionsResponse,
} from '../../src/api/fim';
import {
	clearLastCapturedRequest,
	getLastCapturedRequest,
	setLastCapturedRequest,
} from '../../src/api/lastRequestCapture';
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
		includeRelatedContext: true,
		relatedContextMaxChars: 8192,
		relatedContextMaxFiles: 5,
		relatedContextStrategy: 'auto',
		relatedContextIncludeImports: true,
		relatedContextAllowVendor: true,
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

	it('completions_suffix wraps prompt when relatedContext set', () => {
		const body = buildCompletionsBody({
			prefix: 'pre',
			suffix: 'suf',
			relatedContext: '// File: contract.ts\ninterface I {}',
			config: baseConfig({ fimMode: 'completions_suffix' }),
		});
		assert.equal(body.suffix, 'suf');
		assert.match(String(body.prompt), /contract\.ts/);
		assert.match(String(body.prompt), /\npre$/);
	});

	it('template wraps outside rendered template', () => {
		const body = buildCompletionsBody({
			prefix: 'A',
			suffix: 'B',
			relatedContext: 'REL',
			config: baseConfig({ fimMode: 'template' }),
		});
		const prompt = String(body.prompt);
		assert.match(prompt, /REL/);
		assert.match(prompt, /<PRE>A<SUF>B<MID>/);
	});

	it('completions wraps prefix only', () => {
		const body = buildCompletionsBody({
			prefix: 'pre',
			suffix: 'suf',
			relatedContext: 'CTX',
			config: baseConfig({ fimMode: 'completions' }),
		});
		assert.match(String(body.prompt), /CTX/);
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

	it('includes related block in user message', () => {
		const body = buildChatBody({
			prefix: 'x',
			suffix: 'y',
			relatedContext: 'contract source',
			config: baseConfig({ fimMode: 'chat_pseudo_fim' }),
		});
		const messages = body.messages as Array<{ role: string; content: string }>;
		assert.match(messages[1].content, /contract source/);
		assert.match(messages[1].content, /```related/);
	});
});

describe('fimRequestPayloadSizes', () => {
	it('counts completions prompt including related wrap', () => {
		const sizes = fimRequestPayloadSizes({
			prefix: 'ab',
			suffix: 'cd',
			relatedContext: 'REL',
			config: baseConfig({ fimMode: 'completions' }),
		});
		assert.ok(sizes.promptChars > 2);
		assert.equal(sizes.apiSuffixChars, 0);
	});

	it('counts chat user message', () => {
		const sizes = fimRequestPayloadSizes({
			prefix: 'x',
			suffix: 'y',
			config: baseConfig({ fimMode: 'chat_pseudo_fim' }),
		});
		assert.ok(sizes.chatUserChars > 0);
	});
});

describe('buildFimHttpRequest', () => {
	it('uses /completions for completions_suffix', () => {
		const { path, body } = buildFimHttpRequest({
			prefix: 'a',
			suffix: 'b',
			config: baseConfig({ fimMode: 'completions_suffix' }),
			relatedContext: 'REL',
		});
		assert.equal(path, '/completions');
		assert.match(String(body.prompt), /REL/);
		assert.equal(body.suffix, 'b');
	});

	it('uses /chat/completions for chat_pseudo_fim', () => {
		const { path, body } = buildFimHttpRequest({
			prefix: 'a',
			suffix: 'b',
			config: baseConfig({ fimMode: 'chat_pseudo_fim' }),
		});
		assert.equal(path, '/chat/completions');
		assert.ok(Array.isArray(body.messages));
	});
});

describe('lastRequestCapture', () => {
	it('stores body for manual replay', () => {
		clearLastCapturedRequest();
		setLastCapturedRequest(
			'http://127.0.0.1:8000/v1',
			'/completions',
			{ model: 'm', prompt: 'p' },
			'completions'
		);
		const cap = getLastCapturedRequest();
		assert.ok(cap?.url.endsWith('/completions'));
		assert.equal(cap?.body.prompt, 'p');
		clearLastCapturedRequest();
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
