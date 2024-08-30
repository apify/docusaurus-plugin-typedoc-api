import { parseWithPydocMarkdown } from "./pydoc-markdown";
import { pydocToTypedoc } from "./transform-docs";
import { spinner } from 'zx';

export async function generateJsonFromPythonProject({
    outFile,
    projectRoot,
} : { outFile: string, projectRoot: string }): Promise<void> {  
    const pydocJson = await parseWithPydocMarkdown({ projectRoot });

    await spinner('Converting the Python JSON AST to a TypeDoc-compliant file...', async () => {
        await pydocToTypedoc({
            moduleName: 'python', // TODO: get from project config files or passed options
            outFile,
            pydocJson,
        });
    });
}
