import * as vscode from 'vscode';

export type StatusState = 'disabled' | 'ready' | 'loading' | 'error' | 'no_model';

export class StatusBar {
	private readonly item: vscode.StatusBarItem;
	private state: StatusState = 'no_model';
	private modelLabel = '';
	private errorMessage = '';

	constructor() {
		this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.item.command = 'localAiAutocomplete.openSettings';
		this.render();
		this.item.show();
	}

	setState(state: StatusState, detail?: string): void {
		this.state = state;
		if (detail !== undefined) {
			if (state === 'error') {
				this.errorMessage = detail;
			} else if (state === 'ready' || state === 'no_model') {
				this.modelLabel = detail;
			}
		}
		this.render();
	}

	setModel(model: string): void {
		this.modelLabel = model;
		if (this.state !== 'disabled' && this.state !== 'loading' && this.state !== 'error') {
			this.state = model ? 'ready' : 'no_model';
		}
		this.render();
	}

	dispose(): void {
		this.item.dispose();
	}

	private render(): void {
		switch (this.state) {
			case 'disabled':
				this.item.text = '$(circle-slash) AI: off';
				this.item.tooltip = 'Local AI Autocomplete is disabled.';
				break;
			case 'loading':
				this.item.text = '$(loading~spin) AI: …';
				this.item.tooltip = 'Fetching completion…';
				break;
			case 'error':
				this.item.text = '$(warning) AI: !';
				this.item.tooltip = this.errorMessage || 'Last request failed';
				break;
			case 'no_model':
				this.item.text = '$(question) AI: no model';
				this.item.tooltip = 'Set localAiAutocomplete.model in Settings';
				break;
			case 'ready':
			default: {
				const short =
					this.modelLabel.length > 24
						? this.modelLabel.slice(0, 21) + '…'
						: this.modelLabel;
				this.item.text = `$(sparkle) AI: ${short || 'ready'}`;
				const baseUrl = vscode.workspace
					.getConfiguration('localAiAutocomplete')
					.get<string>('baseUrl', '');
				this.item.tooltip = `Model: ${this.modelLabel}\nEndpoint: ${baseUrl}\nClick to open settings`;
				break;
			}
		}
	}
}
