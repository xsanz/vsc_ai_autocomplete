import { buildApiUrl } from './client';

export interface CapturedApiRequest {
	baseUrl: string;
	path: string;
	url: string;
	body: Record<string, unknown>;
	capturedAt: string;
	fimMode: string;
}

let lastCaptured: CapturedApiRequest | undefined;

export function setLastCapturedRequest(
	baseUrl: string,
	path: string,
	body: Record<string, unknown>,
	fimMode: string
): void {
	lastCaptured = {
		baseUrl,
		path,
		url: buildApiUrl(baseUrl, path),
		body,
		capturedAt: new Date().toISOString(),
		fimMode,
	};
}

export function getLastCapturedRequest(): CapturedApiRequest | undefined {
	return lastCaptured;
}

/** For unit tests */
export function clearLastCapturedRequest(): void {
	lastCaptured = undefined;
}

export function lastRequestBodyJson(pretty = true): string | undefined {
	if (!lastCaptured) {
		return undefined;
	}
	return JSON.stringify(lastCaptured.body, undefined, pretty ? 2 : 0);
}

/** Dev replay only — never embed a real API key. */
export function formatCurlWithPayloadFile(
	captured: CapturedApiRequest,
	payloadFileName: string
): string {
	return [
		'# Set your key before running: export LOCAL_AI_API_KEY=your-key-here',
		`curl -sS -X POST '${captured.url}' \\`,
		`  -H 'Content-Type: application/json' \\`,
		`  -H "Authorization: Bearer \${LOCAL_AI_API_KEY:-YOUR_API_KEY}" \\`,
		`  -d @${payloadFileName}`,
	].join('\n');
}
