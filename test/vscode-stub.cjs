'use strict';

const Module = require('module');

class Position {
	constructor(line, character) {
		this.line = line;
		this.character = character;
	}
}

const vscodeStub = {
	Position,
	workspace: {
		getConfiguration: () => ({
			get: (_key, defaultValue) => defaultValue,
		}),
	},
	window: {
		createOutputChannel: () => ({
			appendLine: () => {},
			show: () => {},
		}),
	},
	ConfigurationTarget: { Global: 1 },
	StatusBarAlignment: { Right: 2 },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') {
		return vscodeStub;
	}
	return originalLoad(request, parent, isMain);
};
