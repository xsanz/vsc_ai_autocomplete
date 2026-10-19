import { normalizeBaseUrl } from '../config';
import { log, logAuthErrorOnce } from '../ui/output';

export interface RequestOptions {
	baseUrl: string;
	apiKey: string;
	timeoutMs: number;
	signal?: AbortSignal;
}

export class HttpStatusError extends Error {
	constructor(
		readonly status: number,
		readonly body: string
	) {
		super(`HTTP ${status}: ${body.slice(0, 500)}`);
		this.name = 'HttpStatusError';
	}

}

/** Resolve an OpenAI-style path under baseUrl using the WHATWG URL API (not url.parse). */
export function buildApiUrl(baseUrl: string, path: string): string {
	const base = normalizeBaseUrl(baseUrl);
	const relative = path.startsWith('/') ? path.slice(1) : path;
	return new URL(relative, `${base}/`).href;
}

export async function apiGet(path: string, opts: RequestOptions): Promise<Response> {
	const url = buildApiUrl(opts.baseUrl, path);
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (opts.apiKey) {
		headers.Authorization = `Bearer ${opts.apiKey}`;
	}
	return fetchWithTimeout(url, { method: 'GET', headers }, opts);
}

export async function apiPost(
	path: string,
	body: unknown,
	opts: RequestOptions
): Promise<Response> {
	const url = buildApiUrl(opts.baseUrl, path);
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
	};
	if (opts.apiKey) {
		headers.Authorization = `Bearer ${opts.apiKey}`;
	}
	return fetchWithTimeout(
		url,
		{ method: 'POST', headers, body: JSON.stringify(body) },
		opts
	);
}

async function fetchWithTimeout(
	url: string | URL,
	init: RequestInit,
	opts: RequestOptions
): Promise<Response> {
	const requestUrl = typeof url === 'string' ? new URL(url) : url;
	const controller = new AbortController();
	const onAbort = () => controller.abort();
	if (opts.signal) {
		if (opts.signal.aborted) {
			controller.abort();
		} else {
			opts.signal.addEventListener('abort', onAbort);
		}
	}
	const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
	try {
		log(`HTTP ${init.method ?? 'GET'} ${requestUrl.href}`, true);
		const res = await fetch(requestUrl, { ...init, signal: controller.signal });
		if (res.status === 401 || res.status === 403) {
			logAuthErrorOnce(`Authentication failed (${res.status}) for ${requestUrl.href}`);
		}
		return res;
	} catch (err) {
		if (err instanceof Error && err.name === 'AbortError') {
			throw err;
		}
		log(`Request failed: ${String(err)}`);
		throw err;
	} finally {
		clearTimeout(timeout);
		if (opts.signal) {
			opts.signal.removeEventListener('abort', onAbort);
		}
	}
}

export async function readJsonOrThrow(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!res.ok) {
		throw new HttpStatusError(res.status, text);
	}
	try {
		return JSON.parse(text) as unknown;
	} catch {
		throw new Error(`Invalid JSON: ${text.slice(0, 200)}`);
	}
}
