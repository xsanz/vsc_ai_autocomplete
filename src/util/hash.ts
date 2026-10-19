export function simpleHash(input: string): string {
	let h = 0;
	for (let i = 0; i < input.length; i++) {
		h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
	}
	return (h >>> 0).toString(16);
}
