import { REPO_ROOT_PLACEHOLDER, TYPEDOC_KINDS } from './consts';
import { InheritanceGraph } from './inheritance';
import { PythonTypeResolver } from './type-parsing';
import type {
	DocspecDocstring,
	DocspecObject,
	TypeDocDocstring,
	TypeDocObject,
	TypeDocType,
} from './types';
import { getGroupName, getOID, isHidden, isOverload, projectUsesDocsGroupDecorator, sortChildren } from './utils';

interface TransformObjectOptions {
	/**
	 * The current docspec (`pydoc-markdown`) object to transform.
	 */
	currentDocspecNode: DocspecObject;
	/**
	 * The already (partially) transformed parent Typedoc object.
	 */
	parentTypeDoc: TypeDocObject;
	/**
	 * The full name of the module the current object is in.
	 */
	moduleName: string;
}

interface DocspecTransformerOptions {
	/**
	 * A map of module shortcuts, where the key is the full name of the module, and the value is the shortened name.
	 */
	moduleShortcuts?: Record<string, string>;
}

export class DocspecTransformer {
	private pythonTypeResolver: PythonTypeResolver;

	private inheritanceGraph: InheritanceGraph = new InheritanceGraph();

	private symbolIdMap: Record<number, { qualifiedName: string; sourceFileName: string }> = {};

	private namesToIds: Record<string, number> = {};

	private moduleShortcuts: Record<string, string>;

	/**
	 * Stack of the docstrings of the current context.
	 *
	 * Used to read the class Google-style docstrings from the class' properties and methods.
	 */
	private contextStack: TypeDocDocstring[] = [];

	private settings: { useDocsGroup: boolean } = { useDocsGroup: false };

	constructor({ moduleShortcuts }: DocspecTransformerOptions) {
		this.pythonTypeResolver = new PythonTypeResolver();
		this.moduleShortcuts = moduleShortcuts ?? {};
	}

	transform(docspecModules: DocspecObject[]): TypeDocObject {
		// Root object of the Typedoc structure, accumulator for the recursive walk
		const typedocApiReference: TypeDocObject = {
			children: [],
			flags: {},
			groups: [],
			id: 0,
			kind: 1,
			kindString: 'Project',
			name: 'apify-client',
			sources: [
				{
					character: 0,
					fileName: 'src/index.ts',
					line: 1,
				},
			],
			symbolIdMap: this.symbolIdMap,
		};

		this.settings.useDocsGroup = projectUsesDocsGroupDecorator(
			docspecModules as unknown as { name: string },
		);

		// Convert all the modules, store them in the root object
		for (const module of docspecModules) {
			this.walkAndTransform({
				currentDocspecNode: module,
				moduleName: module.name,
				parentTypeDoc: typedocApiReference,
			});
		}

		this.inheritanceGraph.resolveInheritance();
		this.pythonTypeResolver.resolveTypes();

		this.namesToIds = Object.entries(this.symbolIdMap).reduce<Record<string, number>>(
			(acc, [id, { qualifiedName }]) => {
				acc[qualifiedName] = Number(id);
				return acc;
			},
			{},
		);

		this.fixRefs(typedocApiReference);
		sortChildren(typedocApiReference);

		return typedocApiReference;
	}

	private getContext() {
		return this.contextStack[this.contextStack.length - 1];
	}

	private popContext() {
		this.contextStack.pop();
	}

	private newContext(context: TypeDocDocstring) {
		this.contextStack.push(context);
	}

	/**
	 * Recursively traverse the Typedoc structure and fix the references to the named entities.
	 *
	 * Searches for the {@link TypeDocType} structure with the `type` property set to `reference`, and replaces the `target` property
	 * with the corresponding ID of the named entity.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private fixRefs(obj: Record<string, any>) {
		for (const key of Object.keys(obj)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (key === 'name' && obj?.type === 'reference' && this.namesToIds[obj?.name]) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				obj.target = this.namesToIds[obj?.name];
			}
			if (typeof obj[key] === 'object' && obj[key] !== null) {
				this.fixRefs(obj[key] as TypeDocObject);
			}
		}
	}

	private makeMethodSignature(docspecObject: DocspecObject, docstring: TypeDocDocstring): TypeDocObject['signatures'][number] {
		return {
			comment: docstring.text
				? {
						blockTags: docstring?.returns
							? [{ content: [{ kind: 'text', text: docstring.returns }], tag: '@returns' }]
							: undefined,
						summary: [
							{
								kind: 'text',
								text: docstring?.text,
							},
						],
					}
				: undefined,
			flags: {},
			id: getOID(),
			kind: 4096,
			kindString: 'Call signature',
			modifiers: docspecObject.modifiers ?? [],
			name: docspecObject.name,
			parameters: docspecObject.args
				?.filter((arg) => arg.name !== 'self' && arg.name !== 'cls')
				.map((arg) => ({
					comment: docstring.args?.[arg.name]
						? {
								summary: [
									{
										kind: 'text',
										text: docstring.args[arg.name],
									},
								],
							}
						: undefined,
					defaultValue: arg.default_value as string,
					flags: {
						isOptional: arg.datatype?.includes('Optional') || arg.default_value !== undefined,
						'keyword-only': arg.type === 'KEYWORD_ONLY',
					},
					id: getOID(),
					kind: 32_768,
					kindString: 'Parameter',
					name: arg.name,
					type: this.pythonTypeResolver.registerType(arg.datatype),
				})),
			type: this.pythonTypeResolver.registerType(docspecObject.return_type),
		};
	}

	/**
	 * Given a docspec object outputted by `pydoc-markdown`, transforms this object into the Typedoc structure,
	 * and appends it as a child of the `parentTypeDoc` Typedoc object (which serves as an accumulator for the recursion).
	 * @param obj
	 * @param parent
	 * @param module
	 */
	private walkAndTransform({
		currentDocspecNode,
		parentTypeDoc,
		moduleName,
	}: TransformObjectOptions) {
		if (isHidden(currentDocspecNode)) {
			for (const docspecMember of currentDocspecNode.members ?? []) {
				this.walkAndTransform({
					currentDocspecNode: docspecMember,
					moduleName,
					// Skips the hidden member, i.e. its children will be appended to the parent of the hidden member
					parentTypeDoc,
				});
			}

			return;
		}

		const { typedocType, typedocKind } = this.getTypedocType(currentDocspecNode, parentTypeDoc);
		const { filePathInRepo } = this.getGitHubUrls(currentDocspecNode);
		currentDocspecNode.parsedDocstring = this.parseDocstring(currentDocspecNode);
		
		const isOverloadedMethod = typedocKind.kindString === 'Method' && isOverload(currentDocspecNode);

		if (isOverloadedMethod) {
			parentTypeDoc.overloads ??= [];
			parentTypeDoc.overloads.push(currentDocspecNode);
			return;
		}

		const currentId = getOID();

		this.symbolIdMap[currentId] = {
			qualifiedName: currentDocspecNode.name,
			sourceFileName: filePathInRepo,
		};

		// Get the module name of the member, and check if it has a shortcut (reexport from an ancestor module)
		const fullName = `${moduleName}.${currentDocspecNode.name}`;
		if (fullName in this.moduleShortcuts) {
			moduleName = this.moduleShortcuts[fullName].replace(`.${currentDocspecNode.name}`, '');
		}

		currentDocspecNode.name =
			currentDocspecNode.decorations?.find((d) => d.name === 'docs_name')?.args.slice(2, -2) ??
			currentDocspecNode.name;

		// Create the Typedoc member object
		const currentTypedocNode: TypeDocObject = {
			...typedocKind,
			children: [],
			parsedDocstring: currentDocspecNode.parsedDocstring,
			comment: currentDocspecNode.parsedDocstring
				? {
						summary: [
							{
								kind: 'text',
								text: currentDocspecNode.parsedDocstring.text,
							},
						],
					}
				: undefined,
			decorations: currentDocspecNode.decorations?.map(({ name, args }) => ({ args, name })),
			flags: {},
			groups: [],
			id: currentId,
			module: moduleName, // This is an extension to the original Typedoc structure, to support showing where the member is exported from
			name: currentDocspecNode.name,
			sources: [
				{
					character: 1,
					fileName: filePathInRepo,
					line: currentDocspecNode.location.lineno,
				},
			],
			type: typedocType,
		};

		if (currentTypedocNode.kindString === 'Method') {
			currentTypedocNode.signatures = [
				this.makeMethodSignature(currentDocspecNode, currentDocspecNode.parsedDocstring),
			];
		}

		if (currentTypedocNode.kindString === 'Class') {
			this.newContext(currentDocspecNode.parsedDocstring);
		}

		for (const docspecMember of currentDocspecNode.members ?? []) {
			this.walkAndTransform({
				currentDocspecNode: docspecMember,
				moduleName,
				parentTypeDoc: currentTypedocNode,
			});
		}

		if (currentTypedocNode.kindString === 'Class') {
			this.popContext();

			if (currentDocspecNode.bases && currentDocspecNode.bases.length > 0) {
				for (const base of currentDocspecNode.bases) {
					const canonicalAncestorType = this.pythonTypeResolver.getBaseType(base);

					this.inheritanceGraph.addRelationship(canonicalAncestorType, currentTypedocNode);
				}
			}

			for (const overload of currentTypedocNode.overloads ?? []) {
				const baseMethod = currentTypedocNode.children?.find((child) => child.name === overload.name && child.kindString === 'Method' && child.decorations.every((d) => d.name !== 'overload'));

				if (baseMethod) {
					baseMethod.signatures?.push(
						this.makeMethodSignature(
							overload, 
							overload.parsedDocstring.text.length > 0 ? 
								overload.parsedDocstring : 
								baseMethod.parsedDocstring
						),
					);
				} else {
					console.warn(`Method ${overload.name} not found in class ${currentTypedocNode.name} (but overload ${overload.name} exists).`);
				}
			}

			currentTypedocNode.overloads = undefined;

			this.inheritanceGraph.registerNode(currentTypedocNode);
		}

		const { groupName, source: groupSource } = getGroupName(currentTypedocNode);

		if (
			groupName && // If the group comes from a decorator, use it always; otherwise check if the symbol isn't top-level
			(!this.settings.useDocsGroup ||
				groupSource === 'decorator' ||
				parentTypeDoc.kindString !== 'Project')
			&& !isOverloadedMethod
		) {
			const group = parentTypeDoc.groups?.find((g) => g.title === groupName);
			if (group) {
				group.children.push(currentTypedocNode.id);
			} else {
				parentTypeDoc.groups?.push({
					children: [currentTypedocNode.id],
					title: groupName,
				});
			}
		}

		parentTypeDoc.children?.push(currentTypedocNode);
		sortChildren(currentTypedocNode);
	}

	// Get the URL of the member in GitHub
	private getGitHubUrls(docspecMember: DocspecObject): { filePathInRepo: string } {
		const filePathInRepo = docspecMember.location.filename.replace(REPO_ROOT_PLACEHOLDER, '');

		return { filePathInRepo };
	}

	/**
	 * If possible, parses the `.docstring` property of the passed object. If the docstring is a stringified JSON object,
	 * it extracts the `args` and `returns` sections and adds them to the returned object.
	 *
	 * TODO
	 * This structure is created in the `google` docstring format, which is a JSON object with the following structure:
	 */
	private parseDocstring(docspecMember: DocspecObject): TypeDocDocstring {
		const docstring: TypeDocDocstring = { text: docspecMember.docstring?.content ?? '' };

		try {
			const parsedDocstring = JSON.parse(docstring.text) as DocspecDocstring;

			docstring.text = parsedDocstring.text;
			const parsedArguments = (parsedDocstring.sections?.find(
				(section) => Object.keys(section)[0] === 'Arguments',
			)?.Arguments ?? []) as DocspecDocstring['args'];

			docstring.args =
				parsedArguments?.reduce<Record<string, string>>((acc, arg) => {
					acc[arg.param] = arg.desc;
					return acc;
				}, {}) ?? {};

			const returnTypes =
				docstring.sections?.find((section) => Object.keys(section)[0] === 'Returns')?.Returns ?? [];

			docstring.returns = returnTypes.join('\n');
		} catch {
			// Do nothing
		}

		if (!docstring.text) {
			docstring.text = this.getContext()?.args?.[docspecMember.name] ?? '';
		}

		return docstring;
	}

	/**
	 * Given the current Docspec object and the parent Typedoc object, returns the Typedoc type and kind of the current object.
	 */
	private getTypedocType(
		docspecMember: DocspecObject,
		parentTypeDoc: TypeDocObject,
	): { typedocType: TypeDocType; typedocKind: (typeof TYPEDOC_KINDS)[keyof typeof TYPEDOC_KINDS] } {
		let typedocKind = TYPEDOC_KINDS[docspecMember.type];

		if (docspecMember.bases?.includes('Enum')) {
			typedocKind = TYPEDOC_KINDS.enum;
		}

		let typedocType = this.pythonTypeResolver.registerType(docspecMember.datatype);

		if (docspecMember.decorations?.some((d) => ['property', 'dualproperty'].includes(d.name))) {
			typedocKind = TYPEDOC_KINDS.data;
			typedocType = this.pythonTypeResolver.registerType(
				docspecMember.return_type ?? docspecMember.datatype,
			);
		}

		if (parentTypeDoc.kindString === 'Enumeration') {
			typedocKind = TYPEDOC_KINDS.enumValue;
			typedocType = {
				type: 'literal',
				value: docspecMember.value as string,
			};
		}

		return { typedocKind, typedocType };
	}
}
