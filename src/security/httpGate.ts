import * as vscode from 'vscode';
import { validateBaseUrl } from '../config';
import { HostTrustService } from './hostTrust';

export function isWorkspaceTrustedForExtension(): boolean {
	return vscode.workspace.isTrusted;
}

export async function assertCanSendHttp(
	baseUrl: string,
	hostTrust: HostTrustService
): Promise<{ ok: true } | { ok: false; reason: string }> {
	if (!isWorkspaceTrustedForExtension()) {
		return { ok: false, reason: 'Workspace is not trusted.' };
	}
	const urlErr = validateBaseUrl(baseUrl);
	if (urlErr) {
		return { ok: false, reason: urlErr };
	}
	const approved = await hostTrust.ensureHostApproved(baseUrl);
	if (!approved) {
		return { ok: false, reason: 'Server not approved.' };
	}
	return { ok: true };
}

export function untrustedWorkspaceMessage(): string {
	return 'Local AI Autocomplete requires a trusted workspace. Trust this folder to use AI completions.';
}
