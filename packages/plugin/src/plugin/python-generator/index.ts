import { parseWithPydocMarkdown } from "./pydoc-markdown";
import { pydocToTypedoc } from "./transform-docs";

export async function generateJsonFromPythonProject({
    outFile,
    projectRoot,
} : { outFile: string, projectRoot: string }): Promise<void> {
    const pydocJson = await parseWithPydocMarkdown({ projectRoot });

    await pydocToTypedoc({
        moduleName: 'python', // TODO: get from project config files or passed options
        outFile,
        pydocJson,
    });
}
