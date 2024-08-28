import { parseWithPydocMarkdown } from "./pydoc-markdown";
import { pydocToTypedoc } from "./transform-docs";

export async function generateJsonFromPythonProject({
    projectRoot,
    outFile,
}
): Promise<void> {
    const pydoc = await parseWithPydocMarkdown({ projectRoot });

    await pydocToTypedoc({
        moduleName: 'python',
        pydocJson: pydoc,
        outFile,
    });
}
