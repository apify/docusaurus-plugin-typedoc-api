import { load } from "cheerio";

interface TypedocJSONFile {
    children: TypedocJSONFile[];
    groups: { title: string, children: number[] }[];
}

interface ExternalApiItem {
    item: TypedocJSONFile;
    groups: string[];
}

async function loadExternalApiItem(url: string): Promise<ExternalApiItem> {
    console.log(`Loading external API item from ${url}...`);
    const response = await fetch(url);

    const $ = load(await response.text())
    const jsonData = $('script[type="application/json+typedoc-data"]')?.first()?.text();

    if(!jsonData) return null;

    return JSON.parse(jsonData) as ExternalApiItem;
}

export async function injectReexports(typedocJsonFilePath: string, reexports: string[]): Promise<void> {
    // const typedocJson: TypedocJSONFile = await import(typedocJsonFilePath) as TypedocJSONFile;

    const externalApiItems = await Promise.all(reexports.map(loadExternalApiItem));

    console.log(externalApiItems);
}