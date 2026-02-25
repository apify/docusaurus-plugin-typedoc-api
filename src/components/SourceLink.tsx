import type { JSONOutput } from 'typedoc';
import type { DocusaurusConfig } from '@docusaurus/types';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useGitRefName } from '../hooks/useGitRefName';

function replaceWithSrc(url: string): string {
	// Always link the source file
	return url.replace(/\/(dts|dist|lib|build|es|esm|cjs|mjs)\//, '/src/');
}

export interface SourceLinkProps {
	sources?: JSONOutput.SourceReference[];
}

export function resolveGithubUrl(source: JSONOutput.SourceReference & { gitRevision?: string }, siteConfig: DocusaurusConfig, gitRefName: string): string | undefined {
	if (source.url) {
		return source.url;
	}

	if (!siteConfig.githubHost || !siteConfig.organizationName || !siteConfig.projectName) {
		return undefined;
	}

	return `https://${siteConfig.githubHost}${siteConfig.githubPort ? `:${siteConfig.githubPort}` : ''}/${siteConfig.organizationName}/${siteConfig.projectName}/blob/${source.gitRevision ?? gitRefName}/${replaceWithSrc(source.fileName)}#L${source.line}`;
}

export function SourceLink({ sources = [] }: SourceLinkProps) {
	const { siteConfig } = useDocusaurusContext();
	const gitRefName = useGitRefName();

	if (sources.length === 0) {
		return null;
	}

	return (
		<>
			{sources.map((source) => {
				const url = resolveGithubUrl(source, siteConfig as never, gitRefName);

				if (!url) {
					return null;
				}

				return (
					<a
						key={source.fileName}
						className="tsd-anchor"
						href={url}
						rel="noreferrer"
						target="_blank"
					>
						<i className="codicon codicon-file-code" />
					</a>
				);
			})}
		</>
	);
}
