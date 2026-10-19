import type { ExtensionConfig, FimMode } from '../config';
import { apiPost, readJsonOrThrow, RequestOptions } from './client';

export const CHAT_PSEUDO_FIM_SYSTEM =
	'You are a code completion assistant. The user will provide code before and after the cursor. ' +
	'Respond with ONLY the text that should be inserted at the cursor — no markdown fences, no explanation.';

export interface FimRequest {
	prefix: string;
	suffix: string;
	config: ExtensionConfig;
}

export function renderFimTemplate(template: string, prefix: string, suffix: string): string {
	return template.replace(/\{prefix\}/g, prefix).replace(/\{suffix\}/g, suffix);
}

export function buildCompletionsBody(req: FimRequest): Record<string, unknown> {
	const { prefix, suffix, config } = req;
	const base: Record<string, unknown> = {
		model: config.model,
		max_tokens: config.maxTokens,
		temperature: config.temperature,
		stop: config.stop,
		stream: false,
	};

	if (config.fimMode === 'template') {
		return {
			...base,
			prompt: renderFimTemplate(config.fimTemplate, prefix, suffix),
		};
	}

	if (config.fimMode === 'completions_suffix') {
		return {
			...base,
			prompt: prefix,
			suffix,
		};
	}

	return {
		...base,
		prompt: prefix,
	};
}

export function buildChatBody(req: FimRequest): Record<string, unknown> {
	const { prefix, suffix, config } = req;
	const userContent =
		'Complete the code at the cursor. Output only the insertion text.\n\n' +
		'```before-cursor\n' +
		prefix +
		'\n```\n\n```after-cursor\n' +
		suffix +
		'\n```';

	return {
		model: config.model,
		max_tokens: config.maxTokens,
		temperature: config.temperature,
		stream: false,
		messages: [
			{ role: 'system', content: CHAT_PSEUDO_FIM_SYSTEM },
			{ role: 'user', content: userContent },
		],
	};
}

export function parseCompletionsResponse(json: unknown): string | undefined {
	const data = json as { choices?: Array<{ text?: string }> };
	const text = data.choices?.[0]?.text;
	if (text === undefined || text === '') {
		return undefined;
	}
	return text;
}

export function parseChatResponse(json: unknown): string | undefined {
	const data = json as {
		choices?: Array<{ message?: { content?: string } }>;
	};
	const content = data.choices?.[0]?.message?.content;
	if (content === undefined || content === '') {
		return undefined;
	}
	return content;
}

export async function fimComplete(
	req: FimRequest,
	opts: RequestOptions
): Promise<string | undefined> {
	const { config } = req;
	if (config.fimMode === 'chat_pseudo_fim') {
		const body = buildChatBody(req);
		const res = await apiPost('/chat/completions', body, opts);
		const json = await readJsonOrThrow(res);
		return parseChatResponse(json);
	}

	const body = buildCompletionsBody(req);
	const res = await apiPost('/completions', body, opts);
	const json = await readJsonOrThrow(res);
	return parseCompletionsResponse(json);
}

export function usesChatEndpoint(mode: FimMode): boolean {
	return mode === 'chat_pseudo_fim';
}
