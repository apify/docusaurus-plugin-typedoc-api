export { groupSort } from "./utils";

import fs  from 'fs';
import { DocspecTransformer } from "./transformation";
import { DocspecObject } from "./types";
import { getCurrentPackageName, getPackageGitHubTags } from "./packageVersions";

/**
 * Processes the Python documentation generated by `pydoc-markdown` and transforms it into a format
 * accepted by the TypeDoc JSON generator.
 */
export function processPythonDocs(
    {
        pydocMarkdownDumpPath,
        moduleShortcutsPath,
        outPath,
    } : { 
    pydocMarkdownDumpPath: string, 
    moduleShortcutsPath: string, 
    outPath: string 
}) {
    const githubTags = getPackageGitHubTags(['apify', 'apify_client', 'apify_shared']);
    const currentPackage = getCurrentPackageName();
    githubTags[currentPackage] = 'master';

    const moduleShortcuts = JSON.parse(
        fs.readFileSync(moduleShortcutsPath, 'utf8')
    );
    
    const pydocMarkdownDump = JSON.parse(
        fs.readFileSync(pydocMarkdownDumpPath, 'utf8')
    ) as DocspecObject[];

    const docspecTransformer = new DocspecTransformer({
        moduleShortcuts,
        githubTags: githubTags,
    });

    const typedocApiReference = docspecTransformer.transform(pydocMarkdownDump);

    fs.writeFileSync(outPath, JSON.stringify(typedocApiReference, null, 4));
}