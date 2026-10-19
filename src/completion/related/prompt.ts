export const RELATED_CONTEXT_HEADER =
	'/* --- Related context (reference only; output only what belongs at the cursor) --- */';
export const CURRENT_FILE_HEADER = '/* --- Current file (cursor at end of prefix) --- */';

export function wrapPrefixWithRelatedContext(relatedContext: string, prefix: string): string {
	const related = relatedContext.trim();
	if (!related) {
		return prefix;
	}
	return `${RELATED_CONTEXT_HEADER}\n${related}\n\n${CURRENT_FILE_HEADER}\n${prefix}`;
}

export function appendRelatedToChatUserMessage(
	relatedContext: string,
	userContent: string
): string {
	const related = relatedContext.trim();
	if (!related) {
		return userContent;
	}
	return (
		'Related definitions from other files:\n\n```related\n' +
		related +
		'\n```\n\n' +
		userContent
	);
}
