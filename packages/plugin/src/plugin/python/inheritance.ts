import type { TypeDocObject } from './types';
import { getGroupName, getOID, sortChildren } from './utils';

export class InheritanceGraph {
	private readonly nodes = new Map<TypeDocObject['name'], TypeDocObject>();

	private readonly childrenOf: Map<TypeDocObject['name'], TypeDocObject['name'][]> = new Map();

	/**
	 * Adds a new inheritance relationship.
	 * @param parentName
	 * @param child
	 */
	addRelationship(parentName: TypeDocObject['name'], child: TypeDocObject) {
		const children = this.childrenOf.get(parentName) ?? [];

		children.push(child.name);
		this.childrenOf.set(parentName, children);

		this.nodes.set(child.name, child);

		this.registerNode(child);
	}

	registerNode(node: TypeDocObject) {
		this.nodes.set(node.name, node);
	}

	/**
	 * Resolves the inheritance relationships between the objects.
	 * 
	 * Adds the inherited symbols to the descendants, and sets the `extendedTypes` / `extendedBy` properties.
	 * The symbol inheritance works transitively, so if `A` inherits from `B` and `B` inherits from `C`, then `A` inherits from `C`.
	 *
	 * The order of the inheritance is determined by the topological order of the inheritance graph (to ensure the ancestors are processed before the descendants).
	 */
	resolveInheritance() {
		const objects = this.getTopologicalOrder();

		for (const parent of objects) {
			const children = this.childrenOf.get(parent.name);

			if (children) {
				for (const childId of children) {
					const child = this.nodes.get(childId);

					if (child) {
						this.resolveInheritedSymbols(parent, child);
					}
				}
			}
		}
	}

	protected resolveInheritedSymbols(ancestor: TypeDocObject, descendant: TypeDocObject) {
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

		sortChildren(descendant);
	}

	protected getTopologicalOrder(): TypeDocObject[] {
		const visited = new Set<TypeDocObject['name']>();
		const stack: TypeDocObject[] = [];

		const visit = (nodeName: TypeDocObject['name']) => {
			if (visited.has(nodeName)) return;

			const node = this.nodes.get(nodeName);

			if (!node) {
				throw new Error(`Couldn't find the node with the name ${nodeName}`);
			}

			visited.add(nodeName);

			for (const child of this.childrenOf.get(nodeName) ?? []) {
				visit(child);
			}

			stack.push(node);
		};

		for (const node of this.childrenOf.keys()) {
			visit(node as TypeDocObject['name']);
		}

		return stack.reverse();
	}
}
