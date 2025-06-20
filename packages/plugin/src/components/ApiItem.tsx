/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { PageMetadata } from '@docusaurus/theme-common';
import type { DocusaurusConfig } from '@docusaurus/types';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type { Props as DocItemProps } from '@theme/DocItem';
import { useGitRefName } from '../hooks/useGitRefName';
import { useReflection, useRequiredReflection } from '../hooks/useReflection';
import { useReflectionMap } from '../hooks/useReflectionMap';
import type { TOCItem, TSDDeclarationReflection, TSDDeclarationReflectionMap } from '../types';
import { escapeMdx } from '../utils/helpers';
import { getKindIconHtml } from '../utils/icons';
import ApiItemLayout from './ApiItemLayout';
import { ApiOptionsContext } from './ApiOptionsContext';
import { displayPartsToMarkdown } from './Comment';
import { Flags } from './Flags';
import { Reflection } from './Reflection';
import { resolveGithubUrl } from './SourceLink';
import { TypeParametersGeneric } from './TypeParametersGeneric';

function extractTOC(
	item: TSDDeclarationReflection,
	map: TSDDeclarationReflectionMap,
	hideInherited: boolean,
): TOCItem[] {
	const toc: TOCItem[] = [];
	const mapped = new Set<string>();

	item.groups?.forEach((group) => {
		group.children?.forEach((childId) => {
			const child = map[childId];
			const shouldShow = child?.inheritedFrom ? !hideInherited : true;

			if (!child || !shouldShow || mapped.has(child.name)) {
				return;
			}

			if (!child.permalink || child.permalink.includes('#')) {
				const iconHtml = getKindIconHtml(child.kind, child.name);
				const value = escapeMdx(child.name) ?? '';

				toc.push({
					// @ts-expect-error Not typed upstream
					children: [],
					id: child.name,
					value: iconHtml ? `${iconHtml} ${value}` : value,
					level: 1,
				});

				mapped.add(child.name);
			}
		});
	});

	return toc;
}

export interface ApiItemProps extends Pick<DocItemProps, 'route'> {
	readme?: React.ComponentType;
}

// Recursively traverse the passed object. If the object has a `sources` property, resolve the GitHub URLs.
function resolveGithubUrls(obj: { sources?: { url?: string; fileName: string; line: number; character: number }[] }, siteConfig: DocusaurusConfig, gitRefName: string) {
	if (!obj) return;

	if (obj.sources) {
		obj.sources.forEach((source) => {
			source.url = resolveGithubUrl(source, siteConfig, gitRefName);
		});
	}

	for (const key in obj) {
		if (typeof obj[key as keyof typeof obj] === 'object') {
			resolveGithubUrls(obj[key as keyof typeof obj] as { sources?: { url?: string; fileName: string; line: number; character: number }[] }, siteConfig, gitRefName);
		}
	}
}

function resolveTypeReferences(obj: { type?: "reference", target?: number, ref?: TSDDeclarationReflection }, reflectionMap: TSDDeclarationReflectionMap, baseUrl: string) {
	if (!obj) return;

	if (obj.type === 'reference') {
		const reflectionIdentifier: number = obj.target ?? (obj as { id: number }).id;
		const ref = reflectionIdentifier ? reflectionMap[Number(reflectionIdentifier)] : null;
		obj.target = obj.target ? obj.target : 0;

		const { id, sources, kind, permalink } = ref ?? {};
		// @ts-expect-error Partial reexports
		obj.ref = { id, sources, kind, permalink };
		if (ref && obj.ref) obj.ref.permalink = new URL(ref?.permalink ?? '', baseUrl).toString();
	}

	for (const key in obj) {
		if (typeof obj[key as keyof typeof obj] === 'object') {
			resolveTypeReferences(obj[key as keyof typeof obj] as { type?: "reference", target?: number, permalink?: string }, reflectionMap, baseUrl);
		}
	}
}

function getOwnGroupNames(reflection: TSDDeclarationReflection, reflections: TSDDeclarationReflectionMap): string[] {
	const parent = reflections[(reflection as unknown as { parentId: number }).parentId]

	return parent?.groups?.filter(
		({ children }) => children?.includes(reflection.id)
	).map(({ title }) => title) ?? [];
}

function deepCopy(obj: any): any {
	if (typeof obj !== 'object') return obj;

	const copy: any = Array.isArray(obj) ? [] : {};
	// eslint-disable-next-line guard-for-in
	for (const key in obj) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
		copy[key as keyof typeof copy] = deepCopy(obj[key as keyof typeof obj]);
	}

	return copy;
}

function base64Encode(message: string): string {
	const bytes = new TextEncoder().encode(message);

	const binString = Array.from(bytes, (byte) =>
		String.fromCodePoint(byte),
	  ).join("");

	return btoa(binString);
}

export default function ApiItem({ readme: Readme, route }: ApiItemProps) {
	const [hideInherited, setHideInherited] = useState(false);
	const apiOptions = useMemo(
		() => ({
			hideInherited,
			setHideInherited,
		}),
		[hideInherited, setHideInherited],
	);

	const item = useRequiredReflection((route as unknown as { id: number }).id);
	const reflections = useReflectionMap();
	const toc = useMemo(
		() => extractTOC(item, reflections, hideInherited),
		[item, reflections, hideInherited],
	);

	// Pagination
	const prevItem = useReflection(item.previousId);
	const nextItem = useReflection(item.nextId);
	const pagingMetadata = useMemo(
		() => ({
			next: nextItem
				? {
						permalink: nextItem.permalink,
						title: escapeMdx(nextItem.name) ?? '',
					}
				: undefined,
			previous: prevItem
				? {
						permalink: prevItem.permalink,
						title: escapeMdx(prevItem.name) ?? '',
					}
				: undefined,
		}),
		[nextItem, prevItem],
	);

	const { siteConfig } = useDocusaurusContext();
	const gitRefName = useGitRefName();

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const apiItem = deepCopy(item);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	resolveGithubUrls(apiItem, siteConfig as never, gitRefName);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	resolveTypeReferences(apiItem, reflections, new URL(siteConfig.baseUrl, siteConfig.url).href);

	return (
		<ApiOptionsContext.Provider value={apiOptions}>
			<ApiItemLayout
				heading={
					<>
						<span className="tsd-header-flags">
							<Flags flags={item.flags} />
						</span>
						{escapeMdx(item.name)} <TypeParametersGeneric params={item.typeParameters} />
					</>
				}
				pageMetadata={
					<PageMetadata
						description={item.comment?.summary ? displayPartsToMarkdown(item.comment.summary) : ''}
						title={`${item.name} | API`}
					/>
				}
				pagingMetadata={pagingMetadata}
				route={route}
				toc={toc}
			>
				{Readme && (
					<section className="tsd-readme">
						<Readme />
					</section>
				)}

				<Reflection reflection={item} />
				{/* The `application/json+typedoc-data;base64` is an base64 encoded JSON object that contains the machine-readable API item data. */}
				<script
				// eslint-disable-next-line react/no-danger,react-perf/jsx-no-new-object-as-prop
					dangerouslySetInnerHTML={{__html: base64Encode(
						JSON.stringify(
							{
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
								item: {
									...apiItem,
									nextId: undefined,
									previousId: undefined,
									parentId: undefined,
								},
								groups: getOwnGroupNames(item, reflections),
							},
						)
					)}}
					type="application/typedoc-data;base64"
				/>
			</ApiItemLayout>
		</ApiOptionsContext.Provider>
	);
}
