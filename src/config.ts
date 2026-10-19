import * as vscode from 'vscode';

const SECRET_KEY = 'localAiAutocomplete.apiKey';

export type FimMode = 'completions' | 'completions_suffix' | 'template' | 'chat_pseudo_fim';

export type RelatedContextStrategy = 'auto' | 'lsp_only' | 'heuristic_only';

export interface ExtensionConfig {
	enabled: boolean;
	baseUrl: string;
	model: string;
	maxTokens: number;
	temperature: number;
	debounceMs: number;
	requestTimeoutMs: number;
	prefixMaxChars: number;
	suffixMaxChars: number;
	fimMode: FimMode;
	fimTemplate: string;
	stop: string[];
	languages: string[];
	debug: boolean;
	includeRelatedContext: boolean;
	relatedContextMaxChars: number;
	relatedContextMaxFiles: number;
	relatedContextStrategy: RelatedContextStrategy;
}

export function getConfig(): ExtensionConfig {
	const c = vscode.workspace.getConfiguration('localAiAutocomplete');
	return {
		enabled: c.get<boolean>('enabled', true),
		baseUrl: normalizeBaseUrl(c.get<string>('baseUrl', 'http://127.0.0.1:1234/v1')),
		model: c.get<string>('model', '').trim(),
		maxTokens: c.get<number>('maxTokens', 128),
		temperature: c.get<number>('temperature', 0.2),
		debounceMs: c.get<number>('debounceMs', 300),
		requestTimeoutMs: c.get<number>('requestTimeoutMs', 15000),
		prefixMaxChars: c.get<number>('prefixMaxChars', 8192),
		suffixMaxChars: c.get<number>('suffixMaxChars', 4096),
		fimMode: c.get<FimMode>('fimMode', 'completions_suffix'),
		fimTemplate: c.get<string>('fimTemplate', '<PRE>{prefix}<SUF>{suffix}<MID>'),
		stop: c.get<string[]>('stop', ['\n\n']),
		languages: c.get<string[]>('languages', []),
		debug: c.get<boolean>('debug', false),
		includeRelatedContext: c.get<boolean>('includeRelatedContext', true),
		relatedContextMaxChars: c.get<number>('relatedContextMaxChars', 8192),
		relatedContextMaxFiles: c.get<number>('relatedContextMaxFiles', 5),
		relatedContextStrategy: c.get<RelatedContextStrategy>('relatedContextStrategy', 'auto'),
	};
}

export function normalizeBaseUrl(url: string): string {
	return url.trim().replace(/\/+$/, '');
}

export function validateBaseUrl(url: string): string | undefined {
	if (!url) {
		return 'baseUrl is empty';
	}
	try {
		new URL(url);
		return undefined;
	} catch {
		return `Invalid baseUrl: ${url}`;
	}
}

export async function getApiKey(secrets: vscode.SecretStorage): Promise<string> {
	return (await secrets.get(SECRET_KEY)) ?? '';
}

export async function setApiKey(
	secrets: vscode.SecretStorage,
	value: string
): Promise<void> {
	if (value) {
		await secrets.store(SECRET_KEY, value);
	} else {
		await secrets.delete(SECRET_KEY);
	}
}

export async function setEnabled(enabled: boolean): Promise<void> {
	await vscode.workspace
		.getConfiguration('localAiAutocomplete')
		.update('enabled', enabled, vscode.ConfigurationTarget.Global);
}
