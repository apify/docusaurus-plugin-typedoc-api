import { TYPEDOC_KINDS } from "./consts";

export type OID = number;

export interface TypeDocObject {
    id: OID;
    name: string;
    kind: number;
    kindString: string;
    decorations?: { name: string, args: string }[];
    children?: TypeDocObject[];
    groups?: { title: string, children: OID[] }[];
    flags: Record<string, boolean>;
    module?: string,
    inheritedFrom?: {
        type: string;
        target: OID;
        name: string;
    },
    comment?: {
        summary: { text: string, kind: 'text' }[];
        blockTags?: { tag: string, content: any[] }[];
    };
    signatures?: TypeDocObject[];
    sources?: { 
        fileName: string, 
        line: number, character: number, url: string }[];
    type?: TypeDocType;
    symbolIdMap?: Record<number, { qualifiedName: string, sourceFileName: string }>,
    extendedTypes?: TypeDocType[];
    extendedBy?: TypeDocType[];
    modifiers?: any[];
    parameters?: TypeDocObject[];
}

export interface DocspecObject {
    members: DocspecObject[];
    name: string;
    type: keyof typeof TYPEDOC_KINDS;
    location: { 
        filename: string,
        lineno: number,
    };
    decorations?: { name: string, args: string }[];
    bases?: DocspecType[];
    datatype?: DocspecType;
    return_type?: DocspecType;
    value?: any;
    docstring?: { content: string };
    modifiers?: DocspecType[];
    args?: { name: string, type: DocspecType, default_value: any, datatype: DocspecType }[];
}

export interface TypeDocDocstring {
    text: string;
    returns?: string;
    args?: Record<string, string>;
    sections?: Record<string, any[]>[];
}

export interface DocspecDocstring {
    text: string;
    returns?: string;
    args?: { param: string, desc: string }[];
    sections?: Record<string, any[]>[];
}

export type TypeDocType = {
    type: 'literal',
    value: any,
} | { 
    type: 'reference',
    name: string,
    target?: number,
};

export type DocspecType = string;