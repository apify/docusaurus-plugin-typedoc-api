import childProcess from 'child_process'
import fs from 'fs';
import path from 'path';

/**
 * Looks for the installed versions of the given packages and returns them as a dictionary.
 */
export function getPackageGitHubTags(packageNames: string[]): Record<string, string> {
    // For each package, get the installed version, and set the tag to the corresponding version
    const packageTags: Record<string, string> = {};

    for (const pkg of packageNames) {
        const spawnResult = childProcess.spawnSync('python', ['-c', `import ${pkg}; print(${pkg}.__version__)`]);
        if (spawnResult.status === 0) {
            packageTags[pkg] = `v${spawnResult.stdout.toString().trim()}`;
        }
    }

    return packageTags;
}

export function findNearestInParent(currentPath: string, filename: string) {
    let parentPath = currentPath;
    while (parentPath !== '/') {
        parentPath = path.dirname(parentPath);
        if (fs.existsSync(path.join(parentPath, filename))) {
            return path.join(parentPath, filename);
        }
    }

    throw new Error(`No ${filename} found in any parent directory`);
}

export function getCurrentPackageName(pyprojectTomlPath?: string) {
    const currentPath = path.dirname(__dirname);
    pyprojectTomlPath ??= findNearestInParent(currentPath, 'pyproject.toml');
    const pyprojectToml = fs.readFileSync(pyprojectTomlPath, 'utf8');
    
    return pyprojectToml.match(/^name = "(.+)"$/m)?.[1];
}