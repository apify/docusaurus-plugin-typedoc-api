import { createContext, useMemo, useState } from 'react';
import { PageMetadata } from '@docusaurus/theme-common';
import type { Props as DocItemProps } from '@theme/DocItem';
import { useReflection, useRequiredReflection } from '../hooks/useReflection';
import { useReflectionMap } from '../hooks/useReflectionMap';
import type { TOCItem, TSDDeclarationReflection, TSDDeclarationReflectionMap } from '../types';
import { escapeMdx } from '../utils/helpers';
import { getKindIconHtml } from '../utils/icons';
import ApiItemLayout from './ApiItemLayout';
import { displayPartsToMarkdown } from './Comment';
import { Flags } from './Flags';
import { Reflection } from './Reflection';
import { TypeParametersGeneric } from './TypeParametersGeneric';
import { resolveGithubUrl } from './SourceLink';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useGitRefName } from '../hooks/useGitRefName';
import { DocusaurusConfig } from '@docusaurus/types';

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
			const shouldShow = child.inheritedFrom ? !hideInherited : true;

			if (!shouldShow || mapped.has(child.name)) {
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

export const ApiOptionsContext = createContext({
	hideInherited: false,
	setHideInherited: (hideInherited: boolean) => {},
});

// Recursively traverse the passed object. If the object has a `sources` property, resolve the GitHub URLs.
function resolveGithubUrls(obj: { sources?: { url?: string; fileName: string; line: number; character: number }[] }, siteConfig: DocusaurusConfig, gitRefName: string) {
	if (!obj) return;

	if (obj.sources) {
		obj.sources.forEach((source) => {
			source.url = resolveGithubUrl(source, siteConfig, gitRefName);
		});
	}

	for (const key in obj) {
		if (typeof obj[key] === 'object') {
			resolveGithubUrls(obj[key] as { sources?: { url?: string; fileName: string; line: number; character: number }[] }, siteConfig, gitRefName);
		}
	}
}

function resolveTypeReferences(obj: { type?: "reference", target?: number, ref?: TSDDeclarationReflection }, reflectionMap: TSDDeclarationReflectionMap, baseUrl: string) {
	if(!obj) return;

	if (obj.type === 'reference') {
		const reflectionIdentifier: number = obj.target ?? (obj as { id: number }).id;
		const ref = reflectionIdentifier ? reflectionMap[Number(reflectionIdentifier)] : null;
		obj.target = obj.target ? obj.target : 0;

		const { id, sources, kind, permalink } = ref ?? {};
		// @ts-expect-error Partial reexports
		obj.ref = { id, sources, kind, permalink };
		if (ref) obj.ref.permalink = new URL(ref?.permalink ?? '', baseUrl).toString();
	}

	for (const key in obj) {
		if (typeof obj[key] === 'object') {
			resolveTypeReferences(obj[key] as { type?: "reference", target?: number, permalink?: string }, reflectionMap, baseUrl);
		}
	}
}

function getOwnGroupNames(reflection: TSDDeclarationReflection, reflections: TSDDeclarationReflectionMap): string[] {
	const parent = reflections[(reflection as unknown as { parentId: number }).parentId]

	return parent?.groups?.filter(
		({ children }) => children?.includes(reflection.id)
	).map(({ title }) => title) ?? [];
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

	resolveGithubUrls(item, siteConfig, gitRefName);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-argument
	resolveTypeReferences(item as any, reflections, new URL(siteConfig.baseUrl, siteConfig.url).href);

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
				<script type="application/json+typedoc-data">{JSON.stringify(
					{
						item,
						groups: getOwnGroupNames(item, reflections),
					}, 
					null, 
					4
				)}</script>
			</ApiItemLayout>
		</ApiOptionsContext.Provider>
	);
}
