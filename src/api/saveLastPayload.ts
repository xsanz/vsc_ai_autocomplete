import * as vscode from 'vscode';
import {
	formatCurlWithPayloadFile,
	getLastCapturedRequest,
	lastRequestBodyJson,
} from './lastRequestCapture';

const PAYLOAD_FILE = 'local-ai-last-completions-payload.json';
const CURL_FILE = 'local-ai-last-completions-curl.sh';

export async function copyLastApiPayloadToClipboard(): Promise<boolean> {
	const json = lastRequestBodyJson(true);
	if (!json) {
		void vscode.window.showWarningMessage(
			'No API request captured yet. Trigger an inline completion first (same settings as production).'
		);
		return false;
	}
	await vscode.env.clipboard.writeText(json);
	void vscode.window.showInformationMessage(
		`Copied JSON body (${json.length} chars). May contain source code; API key is not included.`
	);
	return true;
}

export async function saveLastApiPayloadToWorkspace(): Promise<boolean> {
	const captured = getLastCapturedRequest();
	const json = lastRequestBodyJson(true);
	if (!captured || !json) {
		void vscode.window.showWarningMessage(
			'No API request captured yet. Trigger an inline completion first.'
		);
		return false;
	}

	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
		void vscode.window.showWarningMessage('Open a workspace folder to save the payload file.');
		return false;
	}

	const confirm = await vscode.window.showWarningMessage(
		`Save ${PAYLOAD_FILE} and ${CURL_FILE}? They may contain full source code from your project. Do not commit secrets or add to git.`,
		'Save',
		'Cancel'
	);
	if (confirm !== 'Save') {
		return false;
	}

	const payloadUri = vscode.Uri.joinPath(folder.uri, PAYLOAD_FILE);
	const curlUri = vscode.Uri.joinPath(folder.uri, CURL_FILE);

	const curl = formatCurlWithPayloadFile(captured, PAYLOAD_FILE);
	const curlScript =
		`#!/usr/bin/env bash\n# Generated ${captured.capturedAt}\n# POST ${captured.url}\n\n` +
		curl +
		'\n';

	await vscode.workspace.fs.writeFile(payloadUri, Buffer.from(json, 'utf8'));
	await vscode.workspace.fs.writeFile(curlUri, Buffer.from(curlScript, 'utf8'));

	const open = await vscode.window.showInformationMessage(
		`Saved ${PAYLOAD_FILE} and ${CURL_FILE} in workspace root.`,
		'Open payload',
		'Open curl script'
	);
	if (open === 'Open payload') {
		await vscode.window.showTextDocument(payloadUri);
	} else if (open === 'Open curl script') {
		await vscode.window.showTextDocument(curlUri);
	}
	return true;
}
