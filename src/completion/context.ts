import * as vscode from 'vscode';

export interface PrefixSuffix {
	prefix: string;
	suffix: string;
}

export function extractPrefixSuffixFromText(
	fullText: string,
	offset: number,
	prefixMaxChars: number,
	suffixMaxChars: number
): PrefixSuffix {
	const safeOffset = Math.max(0, Math.min(offset, fullText.length));
	const fullPrefix = fullText.slice(0, safeOffset);
	const fullSuffix = fullText.slice(safeOffset);

	const prefix =
		fullPrefix.length <= prefixMaxChars
			? fullPrefix
			: fullPrefix.slice(fullPrefix.length - prefixMaxChars);
	const suffix =
		fullSuffix.length <= suffixMaxChars
			? fullSuffix
			: fullSuffix.slice(0, suffixMaxChars);

	return { prefix, suffix };
}

export function extractPrefixSuffix(
	document: vscode.TextDocument,
	position: vscode.Position,
	prefixMaxChars: number,
	suffixMaxChars: number
): PrefixSuffix {
	const offset = document.offsetAt(position);
	return extractPrefixSuffixFromText(
		document.getText(),
		offset,
		prefixMaxChars,
		suffixMaxChars
	);
}

export function documentSelector(languages: string[]): vscode.DocumentSelector {
	if (languages.length === 0) {
		return { scheme: 'file' };
	}
	return languages.map((lang) => ({ scheme: 'file', language: lang }));
}
