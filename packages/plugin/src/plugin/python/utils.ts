import { GROUP_ORDER, TYPEDOC_KINDS } from "./consts";
import { DocspecObject, OID, TypeDocObject } from "./types";

function* generateOID() {
    let id = 1;
    while (true) {
        yield id++;
    }
}

const oidGenerator = generateOID();

/**
 * Returns automatically incrementing OID. Every call to this function will return a new unique OID.
 * @returns {number} The OID.
 */
export function getOID(): OID {
    return oidGenerator.next().value as OID;
}

/**
 * Given a TypeDoc object, returns the name of the group this object belongs to.
 * @param object The TypeDoc object.
 * @returns The group name and the source of the group name (either 'decorator' or 'predicate').
 */
export function getGroupName(object: TypeDocObject): { groupName: string, source: 'decorator' | 'predicate' } {
    if (object.decorations?.some(d => d.name === 'docs_group')) {
        return {
            groupName: object.decorations.find(d => d.name === 'docs_group')?.args.slice(2,-2),
            source: 'decorator'
        }
    }

    const groupPredicates: Record<string, (obj: TypeDocObject) => boolean> = {
        'Constants': (x) => x.kindString === 'Enumeration',
        'Constructors': (x) => x.kindString === 'Constructor',
        'Enumeration Members': (x) => x.kindString === 'Enumeration Member',
        'Methods': (x) => x.kindString === 'Method',
        'Properties': (x) => x.kindString === 'Property',
    };

    const groupName = Object.entries(groupPredicates).find(
        ([_, predicate]) => predicate(object)
    )?.[0];

    return { groupName, source: 'predicate' };
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
    return !(member.type in TYPEDOC_KINDS) ||
        member.decorations?.some(d => d.name === 'ignore_docs') || 
        member.name === 'ignore_docs';
}

/**
 * Comparator for enforcing the documentation groups order (examples of groups in {@link GROUP_ORDER}).
 * 
 * The groups are sorted by the order in which they appear in {@link GROUP_ORDER}.
 * 
 * This is compatible with the `Array.prototype.sort` method.
 */
export function groupSort(g1: string, g2: string) {
    if(GROUP_ORDER.includes(g1) && GROUP_ORDER.includes(g2)){
        return GROUP_ORDER.indexOf(g1) - GROUP_ORDER.indexOf(g2)
    }
    return g1.localeCompare(g2);
};