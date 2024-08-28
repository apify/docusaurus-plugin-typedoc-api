import { rmSync, writeFileSync } from 'fs';
import path from 'path';
import { $ } from 'zx';

/**
 * Generates the pydoc-markdown configuration file
 * @returns The pydoc-markdown configuration file as a string
 */
function getConfigYml({
    projectRoot
}: { projectRoot: string }): string {
    return `
loaders:
  - type: python
    search_path: ["${projectRoot}"]
processors:
  - type: filter
    skip_empty_modules: true
  - type: crossref
renderer:
  type: docusaurus
  docs_base_path: docs
  relative_output_path: reference
  relative_sidebar_path: sidebar.json
  sidebar_top_level_label: null
`
}

export async function parseWithPydocMarkdown({
    projectRoot,
}: {
    projectRoot: string,
}
): Promise<string> {
    // Check whether the user has Python and pydoc-markdown installed
    for (const cmd of ['python', 'pydoc-markdown']) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await $`${cmd} --version`;
        } catch {
            throw new Error(`Please install ${cmd} to use this plugin with Python projects.`);
        }
    };

    // Generate the JSON file
    try {
        const configYml = getConfigYml({ projectRoot });
        const configPath = path.join(__dirname, 'pydoc-markdown.temp.yml');
        writeFileSync(configPath, configYml);

        const pydoc = await $`pydoc-markdown --quiet --dump ${configPath}`;

        rmSync(configPath);

        let json = await pydoc.text();
    
        json = json.replaceAll(path.resolve(projectRoot), 'REPO_ROOT_PLACEHOLDER');
    
        return json;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // eslint-disable-next-line 
        throw new Error(`Failed to generate JSON file from Python project:\n\t${error.stderr.split('\n').slice(-2).join('\n')}`);
    }
}
