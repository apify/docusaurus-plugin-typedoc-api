import fs from 'fs';

export function removeScopes(text: string, scopes: string[]): string {
	if (scopes.length === 0) {
		return text;
	}

	return scopes.reduce(
		(value, scope) => value.replace(new RegExp(`^(${scope}-|@${scope}/)`), ''),
		text,
	);
}

export async function injectGitRevision(typedocJsonFilePath: string, gitRevision: string): Promise<void> {
	const typedocJson = JSON.parse(fs.readFileSync(typedocJsonFilePath, 'utf8'));

	function walkAndInjectRevision(obj: any): void {
		if (typeof obj !== 'object' || obj === null) {
			return;
		}

		if (Array.isArray(obj)) {
			obj.forEach(walkAndInjectRevision);
			return;
		}

		// Check if this object has sources property with line and fileName
		if (obj.sources && Array.isArray(obj.sources)) {
			obj.sources.forEach((source: any) => {
				if (source.line !== undefined && source.fileName !== undefined) {
					source.gitRevision = gitRevision;
				}
			});
		}

		// Recursively walk all object properties
		Object.values(obj).forEach(walkAndInjectRevision);
	}

	walkAndInjectRevision(typedocJson);
	fs.writeFileSync(typedocJsonFilePath, JSON.stringify(typedocJson, null, 4));
}
