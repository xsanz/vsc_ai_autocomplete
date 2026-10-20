import * as vscode from 'vscode';
import { log } from '../ui/output';

export const APPROVED_HOSTS_KEY = 'localAiAutocomplete.approvedHosts';

export function hostFromBaseUrl(baseUrl: string): string | undefined {
	try {
		return new URL(baseUrl).host.toLowerCase();
	} catch {
		return undefined;
	}
}

export function getApprovedHosts(globalState: vscode.Memento): string[] {
	const raw = globalState.get<string[]>(APPROVED_HOSTS_KEY, []);
	return Array.isArray(raw) ? raw.map((h) => h.toLowerCase()) : [];
}

export async function setApprovedHosts(
	globalState: vscode.Memento,
	hosts: string[]
): Promise<void> {
	await globalState.update(APPROVED_HOSTS_KEY, hosts.map((h) => h.toLowerCase()));
}

export function addApprovedHostPure(hosts: string[], host: string): string[] {
	const h = host.toLowerCase();
	if (hosts.includes(h)) {
		return hosts;
	}
	return [...hosts, h];
}

export function removeApprovedHostPure(hosts: string[], host: string): string[] {
	const h = host.toLowerCase();
	return hosts.filter((x) => x !== h);
}

export interface HostTrustUi {
	showWarningMessage(
		message: string,
		...items: string[]
	): Thenable<string | undefined>;
}

export class HostTrustService {
	private readonly sessionDeniedHosts = new Set<string>();
	private inFlight: Promise<boolean> | undefined;
	private inFlightHost: string | undefined;

	constructor(
		private readonly globalState: vscode.Memento,
		private readonly ui: HostTrustUi = vscode.window
	) {}

	clearSessionDenials(): void {
		this.sessionDeniedHosts.clear();
	}

	onBaseUrlChanged(): void {
		this.sessionDeniedHosts.clear();
	}

	async ensureHostApproved(baseUrl: string): Promise<boolean> {
		const host = hostFromBaseUrl(baseUrl);
		if (!host) {
			return false;
		}

		const approved = getApprovedHosts(this.globalState);
		if (approved.includes(host)) {
			return true;
		}

		if (this.sessionDeniedHosts.has(host)) {
			return false;
		}

		if (this.inFlight && this.inFlightHost === host) {
			return this.inFlight;
		}

		this.inFlightHost = host;
		this.inFlight = this.promptApprove(host).finally(() => {
			this.inFlight = undefined;
			this.inFlightHost = undefined;
		});
		return this.inFlight;
	}

	private async promptApprove(host: string): Promise<boolean> {
		const choice = await this.ui.showWarningMessage(
			`Local AI Autocomplete will send editor and workspace file content to ${host}. ` +
				'If you configured an API key, it is sent as Authorization: Bearer on each request. Approve this server?',
			'Approve',
			'Cancel'
		);
		if (choice !== 'Approve') {
			this.sessionDeniedHosts.add(host);
			log(`Server not approved: ${host}`, true);
			return false;
		}
		const next = addApprovedHostPure(getApprovedHosts(this.globalState), host);
		await setApprovedHosts(this.globalState, next);
		return true;
	}

	async revokeHost(host: string): Promise<void> {
		const next = removeApprovedHostPure(getApprovedHosts(this.globalState), host);
		await setApprovedHosts(this.globalState, next);
	}

	async revokeAllHosts(): Promise<void> {
		await setApprovedHosts(this.globalState, []);
	}
}
