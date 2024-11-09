import { TypeDocObject } from "./types";
import { getGroupName, getOID } from "./utils";

export function injectInheritedChildren(ancestor: TypeDocObject, descendant: TypeDocObject) {
    descendant.children ??= [];

    for (const inheritedChild of ancestor.children ?? []) {
        const ownChild = descendant.children?.find((x) => x.name === inheritedChild.name);

        if (!ownChild) {
            const childId = getOID();

            const { groupName } = getGroupName(inheritedChild);
            if (!groupName) {
                throw new Error(`Couldn't resolve the group name for ${inheritedChild.name} (inherited child of ${ancestor.name})`);
            }

            const group = descendant.groups.find((g) => g.title === groupName);

            if (group) {
                group.children.push(inheritedChild.id);
            } else {
                descendant.groups.push({
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
                    type: "reference",
                }
            });
        } else if (!ownChild.comment?.summary?.[0]?.text) {
            ownChild.inheritedFrom = {
                name: `${ancestor.name}.${inheritedChild.name}`,
                target: inheritedChild.id,
                type: "reference",
            }

            for (const key of Object.keys(inheritedChild)) {
                if(key !== 'id' && key !== 'inheritedFrom') {
                    ownChild[key] = inheritedChild[key as keyof typeof inheritedChild];
                }
            }
        }
    }  
}