import fs from 'fs';
import { TypedocJSONFile } from '../types';

export function removeScopes(text: string, scopes: string[]): string {
	if (scopes.length === 0) {
		return text;
	}

	return scopes.reduce(
		(value, scope) => value.replace(new RegExp(`^(${scope}-|@${scope}/)`), ''),
		text,
	);
}

export function injectGitRevision(typedocJsonFilePath: string, gitRevision: string): void {
	const typedocJson = JSON.parse(fs.readFileSync(typedocJsonFilePath, 'utf8')) as TypedocJSONFile;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function walkAndInjectRevision(obj: Record<string, any> | { sources?: { line?: number, fileName?: string, gitRevision?: string }[] }): void {
		if (typeof obj !== 'object' || obj === null) {
			return;
		}

		if (Array.isArray(obj)) {
			obj.forEach(walkAndInjectRevision);
			return;
		}

		// Check if this object has sources property with line and fileName
		if (obj.sources && Array.isArray(obj.sources)) {
			obj.sources.forEach((source: { line?: number, fileName?: string, gitRevision?: string }) => {
				if (source?.line !== undefined && source?.fileName !== undefined) {
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
