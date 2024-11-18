import { REPO_ROOT_PLACEHOLDER, TYPEDOC_KINDS } from './consts';
import { resolveInheritedSymbols } from './inheritance';
import { PythonTypeResolver } from './type-parsing';
import type {
	DocspecDocstring,
	DocspecObject,
	TypeDocDocstring,
	TypeDocObject,
	TypeDocType,
} from './types';
import { getGroupName, getOID, groupSort, isHidden, projectUsesDocsGroupDecorator } from './utils';

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

	/**
	 * A map of package tags, where the key is the package name, and the value is the tag.
	 */
	githubTags: Record<string, string>;
}

export class DocspecTransformer {
	private pythonTypeResolver: PythonTypeResolver;

	private symbolIdMap: Record<number, { qualifiedName: string; sourceFileName: string }> = {};

	private namesToIds: Record<string, number> = {};

	private moduleShortcuts: Record<string, string>;

	private githubTags: Record<string, string>;

	/**
	 * Maps the name of the class to the list of Typedoc objects representing the classes that extend it.
	 *
	 * This is used for resolving the references to the base classes - in case the base class is encountered after the class that extends it.
	 */
	private forwardAncestorRefs = new Map<string, TypeDocObject[]>();

	/**
	 * Maps the name of the class to the reference to the Typedoc object representing the class.
	 *
	 * This is used to resolve the references to the base classes of a class using the name.
	 */
	private backwardAncestorRefs = new Map<string, TypeDocObject>();

	/**
	 * Stack of the docstrings of the current context.
	 *
	 * Used to read the class Google-style docstrings from the class' properties and methods.
	 */
	private contextStack: TypeDocDocstring[] = [];

	private settings: { useDocsGroup: boolean } = { useDocsGroup: false };

	constructor({ githubTags, moduleShortcuts }: DocspecTransformerOptions) {
		this.pythonTypeResolver = new PythonTypeResolver();
		this.moduleShortcuts = moduleShortcuts ?? {};
		this.githubTags = githubTags ?? {};
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

		this.pythonTypeResolver.resolveTypes();

		this.namesToIds = Object.entries(this.symbolIdMap).reduce<Record<string, number>>(
			(acc, [id, { qualifiedName }]) => {
				acc[qualifiedName] = Number(id);
				return acc;
			},
			{},
		);

		this.fixRefs(typedocApiReference);
		this.sortChildren(typedocApiReference);

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

		const docstring = this.parseDocstring(currentDocspecNode);
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
			comment: docstring
				? {
						summary: [
							{
								kind: 'text',
								text: docstring.text,
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
				{
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
					modifiers: currentDocspecNode.modifiers ?? [],
					name: currentDocspecNode.name,
					parameters: currentDocspecNode.args
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
								isOptional: arg.datatype?.includes('Optional'),
								'keyword-only': arg.type === 'KEYWORD_ONLY',
							},
							id: getOID(),
							kind: 32_768,
							kindString: 'Parameter',
							name: arg.name,
							type: this.pythonTypeResolver.registerType(arg.datatype),
						})),
					type: this.pythonTypeResolver.registerType(currentDocspecNode.return_type),
				},
			];
		}

		if (currentTypedocNode.kindString === 'Class') {
			this.newContext(docstring);

			this.backwardAncestorRefs.set(currentDocspecNode.name, currentTypedocNode);

			if (currentDocspecNode.bases && currentDocspecNode.bases.length > 0) {
				for (const base of currentDocspecNode.bases) {
					const canonicalAncestorType = this.pythonTypeResolver.getBaseType(base);

					const baseTypedocMember = this.backwardAncestorRefs.get(canonicalAncestorType);
					if (baseTypedocMember) {
						resolveInheritedSymbols(baseTypedocMember, currentTypedocNode);
					} else {
						this.forwardAncestorRefs.set(canonicalAncestorType, [
							...(this.forwardAncestorRefs.get(canonicalAncestorType) ?? []),
							currentTypedocNode,
						]);
					}
				}
			}
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
		}

		const { groupName, source: groupSource } = getGroupName(currentTypedocNode);

		if (
			groupName && // If the group comes from a decorator, use it always; otherwise check if the symbol isn't top-level
			(!this.settings.useDocsGroup ||
				groupSource === 'decorator' ||
				parentTypeDoc.kindString !== 'Project')
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

		this.sortChildren(currentTypedocNode);

		if (currentTypedocNode.kindString === 'Class') {
			for (const descendant of this.forwardAncestorRefs.get(currentTypedocNode.name) ?? []) {
				resolveInheritedSymbols(currentTypedocNode, descendant);

				this.sortChildren(descendant);
			}
		}
	}

	// Get the URL of the member in GitHub
	private getGitHubUrls(docspecMember: DocspecObject): { filePathInRepo: string } {
		const filePathInRepo = docspecMember.location.filename.replace(REPO_ROOT_PLACEHOLDER, '');

		return { filePathInRepo };
	}

	/**
	 * Sorts the `groups` of `typedocMember` using {@link groupSort} and sorts the children of each group alphabetically.
	 */
	private sortChildren(typedocMember: TypeDocObject) {
		if (!typedocMember.groups) return;

		for (const group of typedocMember.groups) {
			group.children.sort((a, b) => {
				const firstName =
					typedocMember.children?.find((x) => x.id === a || x.inheritedFrom?.target === a)?.name ??
					'a';
				const secondName =
					typedocMember.children?.find((x) => x.id === b || x.inheritedFrom?.target === b)?.name ??
					'b';
				return firstName.localeCompare(secondName);
			});
		}
		typedocMember.groups?.sort((a, b) => groupSort(a.title, b.title));
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
