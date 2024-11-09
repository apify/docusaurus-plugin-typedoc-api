/* eslint-disable complexity */

import { REPO_ROOT_PLACEHOLDER, REPO_URL_PER_PACKAGE, TYPEDOC_KINDS } from "./consts";
import { PythonTypeResolver } from "./type-parsing";
import { DocspecDocstring, DocspecObject, TypeDocDocstring, TypeDocObject, TypeDocType } from "./types";
import { getOID, groupSort, isHidden } from "./utils";

const contextStack: TypeDocDocstring[] = [];
const getContext = () => contextStack[contextStack.length - 1];
const popContext = () => contextStack.pop();
const newContext = (context: TypeDocDocstring) => contextStack.push(context);

const forwardAncestorRefs = new Map();
const backwardAncestorRefs = new Map();

interface TransformObjectOptions {
    /**
     * The current docspec (`pydoc-markdown`) object to transform.
     */
    currentDocspecNode: DocspecObject,
    /**
     * The already (partially) transformed parent Typedoc object.
     */
    parentTypeDoc: TypeDocObject, 
    /**
     * The full name of the module the current object is in.
     */
    moduleName: string
}

interface DocspecTransformerOptions {
    /**
     * The {@link PythonTypeResolver} instance.
     */
    pythonTypeResolver: PythonTypeResolver
}

export class DocspecTransformer {
    private pythonTypeResolver: PythonTypeResolver;
    
    constructor({ pythonTypeResolver }: DocspecTransformerOptions) {
        this.pythonTypeResolver = pythonTypeResolver;
    }

    /**
 * Given a docspec object outputted by `pydoc-markdown`, retusn a  
 * @param obj 
 * @param parent 
 * @param module 
 */
    transformObject({
        currentDocspecNode, 
        parentTypeDoc, 
        moduleName,
    }: TransformObjectOptions) {
        for (const docspecMember of currentDocspecNode.members ?? []) {
            if (!isHidden(docspecMember)) {
                const { typedocType, typedocKind } = this.getTypedocType(docspecMember, parentTypeDoc);
                const { filePathInRepo, memberGitHubUrl } = this.getGitHubUrls(docspecMember, moduleName);

                const docstring = this.parseDocstring(docspecMember);

                symbolIdMap.push({
                    qualifiedName: docspecMember.name,
                    sourceFileName: filePathInRepo,
                });

                // Get the module name of the member, and check if it has a shortcut (reexport from an ancestor module)
                const fullName = `${moduleName}.${docspecMember.name}`;
                if (fullName in moduleShortcuts) {
                    moduleName = moduleShortcuts[fullName].replace(`.${docspecMember.name}`, '');
                }

                if (docspecMember.name === '_ActorType') {
                    docspecMember.name = 'Actor';
                }

                // Create the Typedoc member object
                const typedocMember: TypeDocObject = {
                    ...typedocKind,
                    children: [],
                    comment: docstring ? {
                        summary: [{
                            kind: 'text',
                            text: docstring.text,
                        }],
                    } : undefined,
                    decorations: docspecMember.decorations?.map(({ name, args }) => ({ args, name })),
                    flags: {},
                    groups: [],
                    id: getOID(),
                    module: moduleName, // This is an extension to the original Typedoc structure, to support showing where the member is exported from
                    name: docspecMember.name,
                    sources: [{
                        character: 1,
                        filename: filePathInRepo,
                        line: docspecMember.location.lineno,
                        url: memberGitHubUrl,
                    }],
                    type: typedocType,
                };

                if(typedocMember.kindString === 'Method') {
                    typedocMember.signatures = [{
                        id: getOID(),
                        name: docspecMember.name,
                        modifiers: docspecMember.modifiers ?? [],
                        kind: 4096,
                        kindString: 'Call signature',
                        flags: {},
                        comment: docstring.text ? {
                            summary: [{
                                kind: 'text',
                                text: docstring?.text,
                            }],
                            blockTags: docstring?.returns ? [
                                { tag: '@returns', content: [{ kind: 'text', text: docstring.returns }] },
                            ] : undefined,
                        } : undefined,
                        type: pythonTypeResolver.registerType(docspecMember.return_type),
                        parameters: docspecMember.args.filter((arg) => (arg.name !== 'self' && arg.name !== 'cls')).map((arg) => ({
                            id: getOID(),
                            name: arg.name,
                            kind: 32_768,
                            kindString: 'Parameter',
                            flags: {
                                isOptional: arg.datatype?.includes('Optional') ? 'true' : undefined,
                                'keyword-only': arg.type === 'KEYWORD_ONLY' ? 'true' : undefined,
                            },
                            type: pythonTypeResolver.registerType(arg.datatype),
                            comment: docstring.args?.[arg.name] ? {
                                summary: [{
                                    kind: 'text',
                                    text: docstring.args[arg.name]
                                }]
                            } : undefined,
                            defaultValue: arg.default_value,
                        })),
                    }];
                }

                if(typedocMember.name === '__init__') {
                    typedocMember.kind = 512;
                    typedocMember.kindString = 'Constructor';
                }

                this.transformObject({
                    currentDocspecNode: docspecMember,
                    moduleName,
                    parentTypeDoc: typedocMember,
                });
                
                if (typedocMember.kindString === 'Class') {
                    newContext(docstring);

                    backwardAncestorRefs.set(docspecMember.name, typedocMember);

                    if (docspecMember.bases?.length > 0) {
                        docspecMember.bases.forEach((base) => {
                            const unwrappedBaseType = pythonTypeResolver.getBaseType(base);

                            const baseTypedocMember = backwardAncestorRefs.get(unwrappedBaseType);
                            if (baseTypedocMember) {
                                typedocMember.extendedTypes = [
                                    ...typedocMember.extendedTypes ?? [],
                                    {
                                        type: 'reference',
                                        name: baseTypedocMember.name,
                                        target: baseTypedocMember.id,
                                    }
                                ];

                                baseTypedocMember.extendedBy = [
                                    ...baseTypedocMember.extendedBy ?? [],
                                    {
                                        type: 'reference',
                                        name: typedocMember.name,
                                        target: typedocMember.id,
                                    }
                                ];

                                injectInheritedChildren(baseTypedocMember, typedocMember);
                            } else {
                                forwardAncestorRefs.set(
                                    unwrappedBaseType, 
                                    [...(forwardAncestorRefs.get(unwrappedBaseType) ?? []), typedocMember],
                                );
                            }
                        });
                    }
                }

                if (typedocMember.kindString === 'Class') {
                    popContext();
                }

                const { groupName, source: groupSource } = getGroupName(typedocMember);

                if (groupName && // Use the decorator classes everytime, but don't render the class-level groups for the root project
                    (groupSource === 'decorator' || parentTypeDoc.kindString !== 'Project')) {
                        const group = parentTypeDoc.groups.find((g) => g.title === groupName);
                        if (group) {
                            group.children.push(typedocMember.id);
                        } else {
                            parentTypeDoc.groups.push({
                                title: groupName,
                                children: [typedocMember.id],
                            });
                        }
                    }

                parentTypeDoc.children.push(typedocMember);

                sortChildren(typedocMember);

                if (typedocMember.kindString === 'Class') {
                    forwardAncestorRefs.get(typedocMember.name)?.forEach((descendant) => {
                        descendant.extendedTypes = [
                            ...descendant.extendedTypes ?? [],
                            {
                                type: 'reference',
                                name: typedocMember.name,
                                target: typedocMember.id,
                            }
                        ];

                        typedocMember.extendedBy = [
                            ...typedocMember.extendedBy ?? [],
                            {
                                type: 'reference',
                                name: descendant.name,
                                target: descendant.id,
                            }
                        ]

                        injectInheritedChildren(typedocMember, descendant);

                        sortChildren(descendant);
                    });
                }
            }
        }
    }

    private getGitHubUrls(docspecMember: DocspecObject, moduleName: string): { filePathInRepo: string, memberGitHubUrl: string } {
        const rootModuleName = moduleName.split('.')[0];
        // Get the URL of the member in GitHub
        const repoBaseUrl = `${REPO_URL_PER_PACKAGE[rootModuleName]}/blob/${TAG_PER_PACKAGE[rootModuleName]}`;
        const filePathInRepo = docspecMember.location.filename.replace(REPO_ROOT_PLACEHOLDER, '');
        const fileGitHubUrl = docspecMember.location.filename.replace(REPO_ROOT_PLACEHOLDER, repoBaseUrl);
        const memberGitHubUrl = `${fileGitHubUrl}#L${docspecMember.location.lineno}`;

        return { filePathInRepo, memberGitHubUrl };
    }

    /**
    * Sorts the `groups` of `typedocMember` using {@link groupSort} and sorts the children of each group alphabetically.
    */
    private sortChildren(typedocMember: TypeDocObject) {
       for (const group of typedocMember.groups) {
           group.children
               .sort((a, b) => {
                   const firstName = typedocMember.children.find(x => x.id === a || x.inheritedFrom?.target === a).name;
                   const secondName = typedocMember.children.find(x => x.id === b || x.inheritedFrom?.target === b).name;
                   return firstName.localeCompare(secondName);
               });
       }
       typedocMember.groups.sort((a, b) => groupSort(a.title, b.title));
   }

    private parseDocstring(docspecMember: DocspecObject): TypeDocDocstring {
        const docstring: TypeDocDocstring = { text: docspecMember.docstring?.content ?? '' };

        try {
            const parsedDocstring = JSON.parse(docstring.text) as DocspecDocstring;

            const parsedArguments = (
                parsedDocstring.sections
                    .find((section) => Object.keys(section)[0] === 'Arguments').Arguments
                ?? []
            ) as DocspecDocstring['args'];

            docstring.args = parsedArguments.reduce((acc, arg) => {
                acc[arg.param] = arg.desc;
                return acc;
            }, {});

            const returnTypes = docstring.sections.find((section) => Object.keys(section)[0] === 'Returns').Returns ?? [];

            docstring.returns = returnTypes.join('\n');
        } catch {
            // Do nothing
        }

        if (!docstring.text) {
            docstring.text = getContext()?.args?.[docspecMember.name] ?? '';
        }

        return docstring;
    }

    /**
     * Given the current Docspec object and the parent Typedoc object, returns the Typedoc type and kind of the current object.
     */
    private getTypedocType(docspecMember: DocspecObject, parentTypeDoc: TypeDocObject): { typedocType: TypeDocType, typedocKind: typeof TYPEDOC_KINDS[keyof typeof TYPEDOC_KINDS] } {
        let typedocKind = TYPEDOC_KINDS[docspecMember.type];
    
        if (docspecMember.bases?.includes('Enum')) {
            typedocKind = TYPEDOC_KINDS.enum;
        }
    
        let typedocType = this.pythonTypeResolver.registerType(docspecMember.datatype);
    
        if (docspecMember.decorations?.some(d => ['property', 'dualproperty'].includes(d.name))) {
            typedocKind = TYPEDOC_KINDS.data;
            typedocType = this.pythonTypeResolver.registerType(docspecMember.return_type ?? docspecMember.datatype);
        }
    
        if (parentTypeDoc.kindString === 'Enumeration') {
            typedocKind = TYPEDOC_KINDS.enumValue;
            typedocType = {
                type: 'literal',
                value: docspecMember.value,
            }
        }

        return { typedocKind, typedocType };
    }
}