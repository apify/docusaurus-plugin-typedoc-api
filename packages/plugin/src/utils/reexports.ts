/* eslint-disable */
// @ts-nocheck

import { load } from "cheerio";
import fs from "fs";
import { TypedocJSONFile } from "../types";

interface ExternalApiItem {
    item: TypedocJSONFile;
    groups: string[];
}

function decodeBase64UTF8(base64: string): string {
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
    return new TextDecoder('utf8').decode(bytes);
}

async function loadExternalApiItem(url: string): Promise<ExternalApiItem> {
    console.log(`Loading external API item from ${url}...`);
    const response = await fetch(url);

    const $ = load(await response.text(), { decodeEntities: false })
    const base64encoded = $('script[type="application/typedoc-data;base64"]')?.first()?.text();

    if(!base64encoded) return null;

    const jsonData = decodeBase64UTF8(base64encoded);
    return JSON.parse(jsonData) as ExternalApiItem;
}

// Recursively find the maximum numerical `id` property in a JS object
function getMaxId(obj: any) {
    let maxId = 0;
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            maxId = Math.max(maxId, getMaxId(obj[key]));
        } else if (key === 'id') {
            if (Number.isInteger(obj[key])) {
                maxId = Math.max(maxId, obj[key]);
            }
        }
    }

    return maxId;
}

function incrementIds(obj: any, increment: number): number {
    let max = 0;
    for (const key in obj) {
        if (key === 'children' && Array.isArray(obj[key]) && obj[key].every((c: any) => typeof c === 'number')) {
            obj[key] = obj[key].map((c: number) => c + increment);

            max = Math.max(max, ...obj[key]);
        } else if (key === 'id' && Number.isInteger(obj[key])) {
            obj[key] += increment;

            max = Math.max(obj[key], max);
        } else if (obj[key] && typeof obj[key] === 'object') {
            max = Math.max(incrementIds(obj[key], increment), max);
        }
    }

    return max;
}

export async function injectReexports(typedocJsonFilePath: string, reexports: { url: string, group?: string }[]): Promise<void> {
    const typedocJson = JSON.parse(fs.readFileSync(typedocJsonFilePath, 'utf8')) as TypedocJSONFile;

    let baseId = getMaxId(typedocJson);

    const externalApiItems = await Promise.all(reexports.map(async ({url, group}) => ({
        externalItem: await loadExternalApiItem(url),
        customGroup: group,
    })));

    for (const { externalItem, customGroup } of externalApiItems) {
        if (!externalItem) continue;

        let { item, groups } = externalItem;

        // Make sure the new item doesn't have any conflicting IDs
        baseId = incrementIds(item, baseId);

        // Add the new item to the root children
        typedocJson.children.push(item);

        if (customGroup) {
            groups = [customGroup];
        } else if (groups.length === 0) {
            groups = ['Reexports'];
        }

        for (const groupName of groups) {
            // Assign the new item into the specified groups
            const reexportsGroup = typedocJson.groups.find(g => g.title === groupName);

            if (reexportsGroup) {
                reexportsGroup.children.push(item.id);
            } else {
                typedocJson.groups.push({ title: groupName, children: [item.id] });
            }
        }

        console.log(`Reexported item ${item.name} from ${item.sources[0].fileName} to ${groups.join(', ')}`);
    }

    fs.writeFileSync(typedocJsonFilePath, JSON.stringify(typedocJson, null, 4));
}
