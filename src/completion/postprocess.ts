const DEFAULT_MAX_CHARS = 8192;

export function postProcessCompletion(
	middle: string,
	prefix: string,
	suffix: string,
	stop: string[],
	maxTokens: number
): string {
	let text = middle;

	for (const seq of stop) {
		const idx = text.indexOf(seq);
		if (idx !== -1) {
			text = text.slice(0, idx);
		}
	}

	text = trimDuplicateLeadingWhitespace(text, prefix);
	text = trimOverlapWithSuffix(text, suffix);
	text = clipIfContainsSuffix(text, suffix);

	const cap = Math.max(256, Math.min(DEFAULT_MAX_CHARS, maxTokens * 4));
	if (text.length > cap) {
		text = text.slice(0, cap);
	}

	return text;
}

function trimDuplicateLeadingWhitespace(middle: string, prefix: string): string {
	if (!middle || !prefix) {
		return middle;
	}
	const prefixTrail = prefix.match(/\s+$/)?.[0];
	if (!prefixTrail) {
		return middle;
	}
	if (middle.startsWith(prefixTrail)) {
		return middle.slice(prefixTrail.length);
	}
	return middle;
}

function trimOverlapWithSuffix(middle: string, suffix: string): string {
	if (!suffix) {
		return middle;
	}
	const maxCheck = Math.min(middle.length, suffix.length, 64);
	for (let len = maxCheck; len > 0; len--) {
		const tail = middle.slice(-len);
		if (suffix.startsWith(tail)) {
			return middle.slice(0, -len);
		}
	}
	return middle;
}

function clipIfContainsSuffix(middle: string, suffix: string): string {
	if (!suffix || suffix.length < 2) {
		return middle;
	}
	const idx = middle.indexOf(suffix);
	if (idx !== -1) {
		return middle.slice(0, idx);
	}
	return middle;
}
