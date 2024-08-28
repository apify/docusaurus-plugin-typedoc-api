import { parseWithPydocMarkdown } from "./pydoc-markdown";
import { pydocToTypedoc } from "./transform-docs";

export async function generateJsonFromPythonProject({
    projectRoot,
    outFile,
} : { projectRoot: string, outFile: string }): Promise<void> {
    const pydoc = await parseWithPydocMarkdown({ projectRoot });

    await pydocToTypedoc({
        moduleName: 'python', // TODO: get from project config files or passed options
        pydocJson: pydoc,
        outFile,
    });
}
