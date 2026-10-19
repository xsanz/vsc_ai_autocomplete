import * as vscode from 'vscode';
import { buildApiUrl } from './api/client';
import { listModels } from './api/models';
import { documentSelector } from './completion/context';
import { LocalAiInlineCompletionProvider } from './completion/provider';
import { getApiKey, getConfig, setApiKey, setEnabled, validateBaseUrl } from './config';
import { getOutputChannel, log, resetAuthErrorSessionFlag } from './ui/output';
import { StatusBar } from './ui/statusBar';

let statusBar: StatusBar | undefined;
let provider: LocalAiInlineCompletionProvider | undefined;
let providerRegistration: vscode.Disposable | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let pendingCompletion:
	| {
			resolve: (items: vscode.InlineCompletionItem[] | undefined) => void;
			token: vscode.CancellationToken;
	  }
	| undefined;

export function activate(context: vscode.ExtensionContext): void {
	resetAuthErrorSessionFlag();
	statusBar = new StatusBar();
	context.subscriptions.push(statusBar);

	provider = new LocalAiInlineCompletionProvider(context.secrets, statusBar);

	context.subscriptions.push({
		dispose: () => {
			providerRegistration?.dispose();
			providerRegistration = undefined;
		},
	});
	registerProvider();

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('localAiAutocomplete')) {
				if (e.affectsConfiguration('localAiAutocomplete.baseUrl')) {
					const err = validateBaseUrl(getConfig().baseUrl);
					if (err) {
						log(err);
					}
				}
				if (
					e.affectsConfiguration('localAiAutocomplete.languages') ||
					e.affectsConfiguration('localAiAutocomplete.enabled')
				) {
					registerProvider();
				}
				if (
					e.affectsConfiguration('localAiAutocomplete.includeRelatedContext') ||
					e.affectsConfiguration('localAiAutocomplete.relatedContextMaxChars') ||
					e.affectsConfiguration('localAiAutocomplete.relatedContextMaxFiles') ||
					e.affectsConfiguration('localAiAutocomplete.relatedContextStrategy')
				) {
					provider?.clearCache();
				}
				refreshStatusFromConfig();
			}
		})
	);

	registerCommands(context);
	refreshStatusFromConfig();
	maybeShowOnboarding(context);
}

export function deactivate(): void {
	if (debounceTimer !== undefined) {
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
	}
	if (pendingCompletion) {
		pendingCompletion.resolve(undefined);
		pendingCompletion = undefined;
	}
	provider?.abortInFlight();
	providerRegistration?.dispose();
	providerRegistration = undefined;
	statusBar?.dispose();
	statusBar = undefined;
	provider = undefined;
}

function registerProvider(): void {
	providerRegistration?.dispose();
	providerRegistration = undefined;

	const config = getConfig();
	if (!config.enabled || !provider) {
		refreshStatusFromConfig();
		return;
	}

	const debouncedProvider: vscode.InlineCompletionItemProvider = {
		provideInlineCompletionItems(document, position, inlineContext, token) {
			const cfg = getConfig();
			if (!cfg.enabled) {
				statusBar?.setState('disabled');
				return undefined;
			}

			if (!cfg.model) {
				statusBar?.setState('no_model');
				return undefined;
			}
			statusBar?.setModel(cfg.model);

			return new Promise((resolve) => {
				if (debounceTimer !== undefined) {
					clearTimeout(debounceTimer);
				}
				if (pendingCompletion) {
					pendingCompletion.resolve(undefined);
				}

				pendingCompletion = { resolve, token };

				debounceTimer = setTimeout(async () => {
					debounceTimer = undefined;
					const pending = pendingCompletion;
					pendingCompletion = undefined;
					if (!pending || pending.token.isCancellationRequested || !provider) {
						resolve(undefined);
						return;
					}
					const result = await provider.provideInlineCompletionItems(
						document,
						position,
						inlineContext,
						pending.token
					);
					pending.resolve(result ?? undefined);
				}, cfg.debounceMs);
			});
		},
	};

	providerRegistration = vscode.languages.registerInlineCompletionItemProvider(
		documentSelector(config.languages),
		debouncedProvider
	);
}

function refreshStatusFromConfig(): void {
	const config = getConfig();
	if (!config.enabled) {
		statusBar?.setState('disabled');
	} else if (!config.model.trim()) {
		statusBar?.setState('no_model');
	} else {
		statusBar?.setModel(config.model);
		statusBar?.setState('ready', config.model);
	}
}

function registerCommands(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('localAiAutocomplete.enableToggle', async () => {
			await setEnabled(!getConfig().enabled);
			registerProvider();
			refreshStatusFromConfig();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('localAiAutocomplete.showOutput', () => {
			getOutputChannel().show();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('localAiAutocomplete.setApiKey', async () => {
			const current = await getApiKey(context.secrets);
			const value = await vscode.window.showInputBox({
				title: 'Local AI Autocomplete API Key',
				password: true,
				value: current,
				placeHolder: 'Bearer token (leave empty to clear)',
			});
			if (value === undefined) {
				return;
			}
			await setApiKey(context.secrets, value);
			resetAuthErrorSessionFlag();
			vscode.window.showInformationMessage('API key saved to secret storage.');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('localAiAutocomplete.refreshModels', async () => {
			await refreshModelsCommand(context.secrets);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('localAiAutocomplete.openSettings', () => {
			void vscode.commands.executeCommand(
				'workbench.action.openSettings',
				'localAiAutocomplete'
			);
		})
	);
}

async function refreshModelsCommand(secrets: vscode.SecretStorage): Promise<void> {
	const config = getConfig();
	const urlErr = validateBaseUrl(config.baseUrl);
	if (urlErr) {
		vscode.window.showErrorMessage(urlErr);
		return;
	}
	try {
		const apiKey = await getApiKey(secrets);
		log(
			`Refresh models: GET ${buildApiUrl(config.baseUrl, '/models')}${apiKey ? ' (with API key)' : ''}`
		);
		const models = await listModels({
			baseUrl: config.baseUrl,
			apiKey,
			timeoutMs: config.requestTimeoutMs,
		});
		const ids = models.map((m) => m.id);
		for (const id of ids) {
			log(`  model: ${id}`);
		}
		log(`Refreshed ${ids.length} model(s)`);
		statusBar?.setState('ready', config.model);
		if (ids.length === 0) {
			vscode.window.showWarningMessage(
				`No models returned. See Local AI Autocomplete log.`
			);
		} else {
			vscode.window.showInformationMessage(
				`Found ${ids.length} model(s). Copy an id into Settings → localAiAutocomplete.model`
			);
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log(msg);
		statusBar?.setState('error', msg);
		vscode.window.showErrorMessage(`Model list failed: ${msg}`);
	}
}

function maybeShowOnboarding(context: vscode.ExtensionContext): void {
	const config = getConfig();
	if (!config.model.trim() && config.enabled) {
		const key = 'localAiAutocomplete.onboardingShown';
		if (!context.globalState.get(key)) {
			void context.globalState.update(key, true);
			vscode.window
				.showInformationMessage(
					'Local AI Autocomplete: set Base Url and Model in Settings (type the model id from your server).',
					'Open Settings'
				)
				.then((choice) => {
					if (choice === 'Open Settings') {
						void vscode.commands.executeCommand(
							'workbench.action.openSettings',
							'localAiAutocomplete'
						);
					}
				});
		}
	}
}
