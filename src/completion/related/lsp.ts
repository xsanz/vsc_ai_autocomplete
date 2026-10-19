import * as vscode from 'vscode';

export async function resolveDefinitionUri(
	document: vscode.TextDocument,
	position: vscode.Position
): Promise<vscode.Uri | undefined> {
	try {
		const def = await vscode.commands.executeCommand<
			vscode.Location | vscode.Location[] | vscode.LocationLink[] | undefined
		>('vscode.executeDefinitionProvider', document.uri, position);
		const uri = firstDefinitionUri(def);
		if (uri) {
			return uri;
		}
		const typeDef = await vscode.commands.executeCommand<
			vscode.Location | vscode.Location[] | vscode.LocationLink[] | undefined
		>('vscode.executeTypeDefinitionProvider', document.uri, position);
		return firstDefinitionUri(typeDef);
	} catch {
		return undefined;
	}
}

function firstDefinitionUri(
	locations: vscode.Location | vscode.Location[] | vscode.LocationLink[] | undefined
): vscode.Uri | undefined {
	if (!locations) {
		return undefined;
	}
	const list = Array.isArray(locations) ? locations : [locations];
	for (const loc of list) {
		if (loc instanceof vscode.Location) {
			return loc.uri;
		}
		const link = loc as vscode.LocationLink;
		if (link.targetUri) {
			return link.targetUri;
		}
	}
	return undefined;
}
