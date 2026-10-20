import * as vscode from 'vscode';
import { setApiKey } from '../config';
import { resetAuthErrorSessionFlag } from '../ui/output';
import { getApprovedHosts, HostTrustService } from './hostTrust';
import { untrustedWorkspaceMessage, isWorkspaceTrustedForExtension } from './httpGate';

export async function manageApprovedServersCommand(
	context: vscode.ExtensionContext,
	hostTrust: HostTrustService,
	onRevoke: () => void
): Promise<void> {
	if (!isWorkspaceTrustedForExtension()) {
		void vscode.window.showWarningMessage(untrustedWorkspaceMessage());
		return;
	}

	const hosts = getApprovedHosts(context.globalState);
	if (hosts.length === 0) {
		void vscode.window.showInformationMessage('No approved servers. Approve a server on first completion or refresh models.');
		return;
	}

	const items = [
		...hosts.map((h) => ({ label: h, description: 'Revoke approval' })),
		{ label: 'Clear all approved servers…', description: 'Removes all approvals' },
	];

	const pick = await vscode.window.showQuickPick(items, {
		title: 'Manage approved servers',
		placeHolder: 'Select a server to revoke',
	});
	if (!pick) {
		return;
	}

	if (pick.label === 'Clear all approved servers…') {
		const confirm = await vscode.window.showWarningMessage(
			'Remove all approved servers? Your stored API key will be cleared.',
			'Revoke all',
			'Cancel'
		);
		if (confirm !== 'Revoke all') {
			return;
		}
		await hostTrust.revokeAllHosts();
		await clearKeyAfterRevoke(context);
		onRevoke();
		void vscode.window.showInformationMessage(
			'All server approvals removed and API key cleared. Set API Key before using other servers.'
		);
		return;
	}

	const host = pick.label;
	const confirm = await vscode.window.showWarningMessage(
		`Remove approval for ${host}? Your stored API key will be cleared.`,
		'Revoke',
		'Cancel'
	);
	if (confirm !== 'Revoke') {
		return;
	}
	await hostTrust.revokeHost(host);
	await clearKeyAfterRevoke(context);
	onRevoke();
	void vscode.window.showInformationMessage(
		`Removed ${host}. API key cleared — use Set API Key before requests to other servers.`
	);
}

async function clearKeyAfterRevoke(context: vscode.ExtensionContext): Promise<void> {
	await setApiKey(context.secrets, '');
	resetAuthErrorSessionFlag();
}
