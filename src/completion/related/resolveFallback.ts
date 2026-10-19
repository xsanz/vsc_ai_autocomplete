import * as vscode from 'vscode';
import * as path from 'path';

const EXCLUDE_VENDOR_GLOB = '**/{node_modules,vendor,.git}/**';
const EXCLUDE_GIT_ONLY = '**/.git/**';

export function fallbackExcludeGlob(allowVendor: boolean): string {
	return allowVendor ? EXCLUDE_GIT_ONLY : EXCLUDE_VENDOR_GLOB;
}

export function isVendorOrNodeModulesPath(fsPath: string): boolean {
	const normalized = fsPath.replace(/\\/g, '/');
	return (
		/(?:^|\/)(?:vendor|node_modules)(?:\/|$)/.test(normalized)
	);
}

export async function resolveFallbackUri(
	name: string,
	document: vscode.TextDocument,
	allowVendor: boolean,
	token?: vscode.CancellationToken
): Promise<vscode.Uri | undefined> {
	const folder = vscode.workspace.getWorkspaceFolder(document.uri);
	if (!folder) {
		return undefined;
	}

	const pattern = new vscode.RelativePattern(folder, `**/${name}.*`);
	const files = await vscode.workspace.findFiles(
		pattern,
		fallbackExcludeGlob(allowVendor),
		20
	);
	if (token?.isCancellationRequested) {
		return undefined;
	}

	const activeDir = path.dirname(document.uri.fsPath);
	const declRe = new RegExp(`\\b(?:interface|class|trait|type|struct)\\s+${escapeRegExp(name)}\\b`);

	const matching: vscode.Uri[] = [];
	for (const uri of files) {
		const text = await readText(uri, token);
		if (text && declRe.test(text)) {
			matching.push(uri);
		}
	}

	if (matching.length === 0) {
		return files[0];
	}

	matching.sort((a, b) => scoreUri(a, b, activeDir));
	return matching[0];
}

function scoreUri(a: vscode.Uri, b: vscode.Uri, activeDir: string): number {
	return score(a, activeDir) - score(b, activeDir);
}

function score(uri: vscode.Uri, activeDir: string): number {
	const dir = path.dirname(uri.fsPath);
	if (dir === activeDir) {
		return 0;
	}
	if (dir.startsWith(activeDir)) {
		return 1;
	}
	return 2 + uri.fsPath.length;
}

async function readText(
	uri: vscode.Uri,
	token?: vscode.CancellationToken
): Promise<string | undefined> {
	if (token?.isCancellationRequested) {
		return undefined;
	}
	try {
		const doc = await vscode.workspace.openTextDocument(uri);
		return doc.getText();
	} catch {
		return undefined;
	}
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
