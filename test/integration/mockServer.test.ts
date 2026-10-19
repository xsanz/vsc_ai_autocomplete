import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { listModels, type ModelInfo } from '../../src/api/models';
import { fimComplete } from '../../src/api/fim';
import type { ExtensionConfig } from '../../src/config';

function baseConfig(overrides: Partial<ExtensionConfig> = {}): ExtensionConfig {
	return {
		enabled: true,
		baseUrl: 'http://127.0.0.1:0/v1',
		model: 'mock-model',
		maxTokens: 64,
		temperature: 0,
		debounceMs: 0,
		requestTimeoutMs: 5000,
		prefixMaxChars: 1000,
		suffixMaxChars: 1000,
		fimMode: 'completions_suffix',
		fimTemplate: '<PRE>{prefix}<SUF>{suffix}<MID>',
		stop: [],
		languages: [],
		debug: false,
		includeRelatedContext: true,
		relatedContextMaxChars: 8192,
		relatedContextMaxFiles: 5,
		relatedContextStrategy: 'auto',
		...overrides,
	};
}

describe('mock OpenAI-compatible server', () => {
	let server: http.Server;
	let baseUrl: string;
	let lastCompletionsBody: unknown;
	let lastChatBody: unknown;

	before(async () => {
		server = http.createServer((req, res) => {
			const chunks: Buffer[] = [];
			req.on('data', (c) => chunks.push(c));
			req.on('end', () => {
				const body = Buffer.concat(chunks).toString('utf8');
				const parsed = body ? JSON.parse(body) : {};
				if (req.url === '/v1/models' && req.method === 'GET') {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(
						JSON.stringify({
							object: 'list',
							data: [{ id: 'mock-model', object: 'model' }],
						})
					);
					return;
				}
				if (req.url === '/v1/completions' && req.method === 'POST') {
					lastCompletionsBody = parsed;
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ choices: [{ text: 'completed' }] }));
					return;
				}
				if (req.url === '/v1/chat/completions' && req.method === 'POST') {
					lastChatBody = parsed;
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(
						JSON.stringify({
							choices: [{ message: { content: 'chat-mid' } }],
						})
					);
					return;
				}
				res.writeHead(404);
				res.end();
			});
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
		const addr = server.address();
		if (!addr || typeof addr === 'string') {
			throw new Error('no address');
		}
		baseUrl = `http://127.0.0.1:${addr.port}/v1`;
	});

	after(async () => {
		await new Promise<void>((resolve, reject) =>
			server.close((err) => (err ? reject(err) : resolve()))
		);
	});

	it('listModels returns sorted ids', async () => {
		const models = await listModels({
			baseUrl,
			apiKey: '',
			timeoutMs: 5000,
		});
		assert.deepEqual(models.map((m: ModelInfo) => m.id), ['mock-model']);
	});

	it('fimComplete completions (prefix only)', async () => {
		const text = await fimComplete(
			{
				prefix: 'before',
				suffix: 'after',
				config: baseConfig({ baseUrl, fimMode: 'completions' }),
			},
			{ baseUrl, apiKey: '', timeoutMs: 5000 }
		);
		assert.equal(text, 'completed');
		const b = lastCompletionsBody as { prompt?: string; suffix?: string };
		assert.equal(b.prompt, 'before');
		assert.equal('suffix' in b, false);
	});

	it('fimComplete completions_suffix', async () => {
		const text = await fimComplete(
			{
				prefix: 'before',
				suffix: 'after',
				config: baseConfig({ baseUrl, fimMode: 'completions_suffix' }),
			},
			{ baseUrl, apiKey: '', timeoutMs: 5000 }
		);
		assert.equal(text, 'completed');
		const b = lastCompletionsBody as { prompt?: string; suffix?: string };
		assert.equal(b.prompt, 'before');
		assert.equal(b.suffix, 'after');
	});

	it('fimComplete chat_pseudo_fim', async () => {
		const text = await fimComplete(
			{
				prefix: 'P',
				suffix: 'S',
				config: baseConfig({ baseUrl, fimMode: 'chat_pseudo_fim' }),
			},
			{ baseUrl, apiKey: '', timeoutMs: 5000 }
		);
		assert.equal(text, 'chat-mid');
		assert.ok(lastChatBody);
	});

	it('abort cancels in-flight request', async () => {
		const slow = http.createServer((_req, res) => {
			setTimeout(() => {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ choices: [{ text: 'late' }] }));
			}, 500);
		});
		await new Promise<void>((resolve) => slow.listen(0, '127.0.0.1', () => resolve()));
		const addr = slow.address();
		if (!addr || typeof addr === 'string') {
			throw new Error('no address');
		}
		const slowUrl = `http://127.0.0.1:${addr.port}/v1`;
		const ac = new AbortController();
		const p = fimComplete(
			{
				prefix: 'a',
				suffix: 'b',
				config: baseConfig({ baseUrl: slowUrl }),
			},
			{ baseUrl: slowUrl, apiKey: '', timeoutMs: 5000, signal: ac.signal }
		);
		ac.abort();
		await assert.rejects(p, (err: Error) => err.name === 'AbortError');
		await new Promise<void>((resolve, reject) =>
			slow.close((err) => (err ? reject(err) : resolve()))
		);
	});
});
