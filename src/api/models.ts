import { apiGet, buildApiUrl, readJsonOrThrow, RequestOptions } from './client';
import { log } from '../ui/output';

export interface ModelInfo {
	id: string;
}

/** Parse OpenAI-style and a few common variant list responses. */
export function parseModelsResponse(json: unknown): ModelInfo[] {
	if (!json || typeof json !== 'object') {
		return [];
	}
	const root = json as Record<string, unknown>;
	const rawList: unknown[] = Array.isArray(root.data)
		? root.data
		: Array.isArray(root.models)
			? root.models
			: [];

	const ids: string[] = [];
	for (const entry of rawList) {
		if (typeof entry === 'string' && entry.length > 0) {
			ids.push(entry);
			continue;
		}
		if (!entry || typeof entry !== 'object') {
			continue;
		}
		const item = entry as Record<string, unknown>;
		const id =
			(typeof item.id === 'string' && item.id) ||
			(typeof item.name === 'string' && item.name) ||
			(typeof item.model === 'string' && item.model);
		if (id) {
			ids.push(id);
		}
	}

	return [...new Set(ids)].sort().map((id) => ({ id }));
}

export async function listModels(opts: RequestOptions): Promise<ModelInfo[]> {
	const url = buildApiUrl(opts.baseUrl, '/models');
	log(`Fetching models from ${url}`);
	const res = await apiGet('/models', opts);
	const json = await readJsonOrThrow(res);
	const models = parseModelsResponse(json);
	if (models.length === 0) {
		const preview = JSON.stringify(json).slice(0, 400);
		log(
			`Models response parsed to 0 ids. Body preview: ${preview}${preview.length >= 400 ? '…' : ''}`
		);
	}
	return models;
}
