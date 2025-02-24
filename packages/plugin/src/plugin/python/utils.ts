/* eslint-disable sort-keys */
import { GROUP_ORDER, TYPEDOC_KINDS } from './consts';
import type { DocspecObject, TypeDocObject } from './types';

/**
 * Given a TypeDoc object, returns the name of the group this object belongs to.
 * @param object The TypeDoc object.
 * @returns The group name and the source of the group name (either 'decorator' or 'predicate').
 */
export function getGroupName(object: TypeDocObject): {
	groupName: string | undefined;
	source: 'decorator' | 'predicate';
} {
	if (object.decorations?.some((d) => d.name === 'docs_group')) {
		const parsedGroupName = object.decorations
			.find((d) => d.name === 'docs_group')
			?.args.slice(2, -2);

		if (parsedGroupName) {
			return {
				groupName: parsedGroupName,
				source: 'decorator',
			};
		}
	}

	const groupPredicates: Record<string, (obj: TypeDocObject) => boolean> = {
		'Scrapy integration': (x) =>
			[
				'ApifyScheduler',
				'ActorDatasetPushPipeline',
				'ApifyHttpProxyMiddleware',
				'apply_apify_settings',
			].includes(x.name),
		'Data structures': (x) =>
			Boolean(['BaseModel', 'TypedDict'].some((base) =>
				(x?.bases as { includes: (x: string) => boolean })?.includes(base),
			) || x?.decorations?.some((d) => d.name === 'dataclass')),
		Errors: (x) => x.name.toLowerCase().endsWith('error') && x.kindString === 'Class',
		Classes: (x) => x.kindString === 'Class',
		'Main Clients': (x) => ['ApifyClient', 'ApifyClientAsync'].includes(x.name),
		'Async Resource Clients': (x) => x.name.toLowerCase().includes('async'),
		'Resource Clients': (x) => x.kindString === 'Class' && x.name.toLowerCase().includes('client'),
		Methods: (x) => x.kindString === 'Method',
		Constructors: (x) => x.kindString === 'Constructor',
		Properties: (x) => x.kindString === 'Property',
		Constants: (x) => x.kindString === 'Enumeration',
		'Enumeration members': (x) => x.kindString === 'Enumeration Member',
	};

	const groupName = Object.entries(groupPredicates).find(([_, predicate]) =>
		predicate(object),
	)?.[0];

	return { groupName, source: 'predicate' };
}

/**
 * Recursively search arbitrary JS object for property `name: 'docs_group'`.
 * @param object
 */
export function projectUsesDocsGroupDecorator(object: { name: string }): boolean {
	if (object instanceof Object) {
		if (object.name === 'docs_group') {
			return true;
		}

		for (const key in object) {
			if (projectUsesDocsGroupDecorator(object[key as keyof typeof object] as unknown as { name: string })) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Returns true if the given member should be hidden from the documentation.
 *
 * A member should be hidden if:
 * - It has a `ignore_docs` decoration.
 *
 * @param member The member to check.
 */
export function isHidden(member: DocspecObject): boolean {
	return (
		!(member.type in TYPEDOC_KINDS) ||
		member.decorations?.some((d) => d.name === 'ignore_docs') ||
		member.name === 'ignore_docs'
	);
}

export function isOverload(member: DocspecObject): boolean {
	return member.decorations?.some((d) => d.name === 'overload');
}

/**
 * Comparator for enforcing the documentation groups order (examples of groups in {@link GROUP_ORDER}).
 *
 * The groups are sorted by the order in which they appear in {@link GROUP_ORDER}.
 *
 * This is compatible with the `Array.prototype.sort` method.
 */
export function groupSort(g1: string, g2: string) {
	if (GROUP_ORDER.includes(g1) && GROUP_ORDER.includes(g2)) {
		return GROUP_ORDER.indexOf(g1) - GROUP_ORDER.indexOf(g2);
	}
	return g1.localeCompare(g2);
}

/**
 * Sorts the `groups` of `typedocMember` using {@link groupSort} and sorts the children of each group alphabetically.
 */
export function sortChildren(typedocMember: TypeDocObject) {
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
