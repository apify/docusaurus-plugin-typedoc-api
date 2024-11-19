import type { TypeDocObject } from './types';
import { getGroupName, getOID } from './utils';

/**
 * Given an ancestor and a descendant objects, injects the children of the ancestor into the descendant.
 *
 * Sets the `extendedTypes` / `extendedBy` properties.
 * @param ancestor
 * @param descendant
 */
export function resolveInheritedSymbols(ancestor: TypeDocObject, descendant: TypeDocObject) {
	descendant.children ??= [];

	descendant.extendedTypes = [
		...(descendant.extendedTypes ?? []),
		{
			name: ancestor.name,
			target: ancestor.id,
			type: 'reference',
		},
	];

	ancestor.extendedBy = [
		...(ancestor.extendedBy ?? []),
		{
			name: descendant.name,
			target: descendant.id,
			type: 'reference',
		},
	];

	for (const inheritedChild of ancestor.children ?? []) {
		const ownChild = descendant.children?.find((x) => x.name === inheritedChild.name);

		if (!ownChild) {
			const childId = getOID();

			const { groupName } = getGroupName(inheritedChild);
			if (!groupName) {
				throw new Error(
					`Couldn't resolve the group name for ${inheritedChild.name} (inherited child of ${ancestor.name})`,
				);
			}

			const group = descendant.groups?.find((g) => g.title === groupName);

			if (group) {
				group.children.push(inheritedChild.id);
			} else {
				descendant.groups?.push({
					children: [inheritedChild.id],
					title: groupName,
				});
			}

			descendant.children.push({
				...inheritedChild,
				id: childId,
				inheritedFrom: {
					name: `${ancestor.name}.${inheritedChild.name}`,
					target: inheritedChild.id,
					type: 'reference',
				},
			});
		} else if (!ownChild.comment?.summary?.[0]?.text) {
			ownChild.inheritedFrom = {
				name: `${ancestor.name}.${inheritedChild.name}`,
				target: inheritedChild.id,
				type: 'reference',
			};

			for (const key of Object.keys(inheritedChild)) {
				if (key !== 'id' && key !== 'inheritedFrom') {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					ownChild[key as keyof typeof ownChild] = inheritedChild[key as keyof typeof inheritedChild];
				}
			}
		}
	}
}
