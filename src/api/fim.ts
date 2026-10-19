import type { ExtensionConfig, FimMode } from '../config';
import {
	appendRelatedToChatUserMessage,
	wrapPrefixWithRelatedContext,
} from '../completion/related/prompt';
import { apiPost, readJsonOrThrow, RequestOptions } from './client';

export const CHAT_PSEUDO_FIM_SYSTEM =
	'You are a code completion assistant. The user will provide code before and after the cursor. ' +
	'Respond with ONLY the text that should be inserted at the cursor — no markdown fences, no explanation.';

export const CHAT_PSEUDO_FIM_SYSTEM_RELATED_HINT =
	'Related definitions are for reference; output only the insertion for the current file at the cursor.';

export interface FimRequest {
	prefix: string;
	suffix: string;
	config: ExtensionConfig;
	relatedContext?: string;
}

export function renderFimTemplate(template: string, prefix: string, suffix: string): string {
	return template.replace(/\{prefix\}/g, prefix).replace(/\{suffix\}/g, suffix);
}

export function buildCompletionsBody(req: FimRequest): Record<string, unknown> {
	const { prefix, suffix, config, relatedContext } = req;
	const related = relatedContext ?? '';
	const base: Record<string, unknown> = {
		model: config.model,
		max_tokens: config.maxTokens,
		temperature: config.temperature,
		stop: config.stop,
		stream: false,
	};

	if (config.fimMode === 'template') {
		const rendered = renderFimTemplate(config.fimTemplate, prefix, suffix);
		return {
			...base,
			prompt: wrapPrefixWithRelatedContext(related, rendered),
		};
	}

	if (config.fimMode === 'completions_suffix') {
		return {
			...base,
			prompt: wrapPrefixWithRelatedContext(related, prefix),
			suffix,
		};
	}

	return {
		...base,
		prompt: wrapPrefixWithRelatedContext(related, prefix),
	};
}

export function buildChatBody(req: FimRequest): Record<string, unknown> {
	const { prefix, suffix, config, relatedContext } = req;
	const related = relatedContext ?? '';
	const userContent = appendRelatedToChatUserMessage(
		related,
		'Complete the code at the cursor. Output only the insertion text.\n\n' +
			'```before-cursor\n' +
			prefix +
			'\n```\n\n```after-cursor\n' +
			suffix +
			'\n```'
	);

	const system =
		related.trim().length > 0
			? `${CHAT_PSEUDO_FIM_SYSTEM} ${CHAT_PSEUDO_FIM_SYSTEM_RELATED_HINT}`
			: CHAT_PSEUDO_FIM_SYSTEM;

	return {
		model: config.model,
		max_tokens: config.maxTokens,
		temperature: config.temperature,
		stream: false,
		messages: [
			{ role: 'system', content: system },
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

export interface FimPayloadSizes {
	fimMode: FimMode;
	promptChars: number;
	apiSuffixChars: number;
	chatUserChars: number;
}

/** Character counts of the payload actually sent to the API (for debug logging). */
export function fimRequestPayloadSizes(req: FimRequest): FimPayloadSizes {
	const { config } = req;
	if (config.fimMode === 'chat_pseudo_fim') {
		const body = buildChatBody(req);
		const messages = body.messages as Array<{ role: string; content: string }>;
		const user = messages.find((m) => m.role === 'user')?.content ?? '';
		return {
			fimMode: config.fimMode,
			promptChars: 0,
			apiSuffixChars: 0,
			chatUserChars: user.length,
		};
	}
	const body = buildCompletionsBody(req);
	const prompt = typeof body.prompt === 'string' ? body.prompt : '';
	const apiSuffix = typeof body.suffix === 'string' ? body.suffix : '';
	return {
		fimMode: config.fimMode,
		promptChars: prompt.length,
		apiSuffixChars: apiSuffix.length,
		chatUserChars: 0,
	};
}
