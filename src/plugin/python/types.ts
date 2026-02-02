/* eslint-disable @typescript-eslint/no-explicit-any */
import { TYPEDOC_KINDS } from './consts';

export type OID = number;

export interface TypeDocObject {
	[key: string]: any;
	id: OID;
	name: string;
	kind: number;
	kindString: string;
	decorations?: { name: string; args: string }[];
	children?: TypeDocObject[];
	groups?: { title: string; children: OID[] }[];
	flags: Record<string, boolean>;
	module?: string;
	inheritedFrom?: {
		type: string;
		target: OID;
		name: string;
	};
	overwrites?: {
		type: string;
		target: OID;
		name: string;
	};
	comment?: {
		summary: { text: string; kind: 'text' }[];
		blockTags?: { tag: string; content: any[] }[];
	};
	signatures?: TypeDocObject[];
	sources?: {
		fileName: string;
		line: number;
		character: number;
		gitRevision?: string;
	}[];
	type?: TypeDocType;
	symbolIdMap?: Record<number, { qualifiedName: string; sourceFileName: string }>;
	extendedTypes?: TypeDocType[];
	extendedBy?: TypeDocType[];
	modifiers?: any[];
	parameters?: TypeDocObject[];
	overloads?: DocspecObject[];
	parsedDocstring?: TypeDocDocstring;
}

export interface DocspecObject {
	members: DocspecObject[];
	name: string;
	type: keyof typeof TYPEDOC_KINDS;
	location: {
		filename: string;
		lineno: number;
	};
	decorations?: { name: string; args: string }[];
	bases?: DocspecType[];
	datatype?: DocspecType;
	return_type?: DocspecType;
	value?: any;
	docstring?: { content: string };
	parsedDocstring?: TypeDocDocstring;
	modifiers?: DocspecType[];
	args?: { name: string; type: DocspecType; default_value: any; datatype: DocspecType }[];
}

export interface TypeDocDocstring {
	text: string;
	returns?: string;
	args?: Record<string, string>;
	sections?: Record<string, any[]>[];
}

export type DocspecDocstringContentItem = Record<string, any[]> | string;

export interface DocspecDocstring {
	content: DocspecDocstringContentItem[];
}

export type TypeDocType =
	{
			[key: string]: any;
			type: 'reference';
			name: string;
			target?: number;
	  } | {
			type: 'literal';
			value: any;
	  };

export type DocspecType = string;
