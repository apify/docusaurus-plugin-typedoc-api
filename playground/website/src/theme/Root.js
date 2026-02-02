import React from 'react';
import { TitleFormatterProvider } from '@docusaurus/theme-common/internal';
import {
	DocsPreferredVersionContextProvider,
	DocsVersionProvider,
} from '@docusaurus/plugin-content-docs/client';

// Default implementation, that you can customize
export default function Root({ children }) {
	return (
		<DocsVersionProvider
			version={{
				badge: false,
				banner: 'unreleased',
				docs: [],
			}}
		>
			<DocsPreferredVersionContextProvider>
				<TitleFormatterProvider formatter={() => 'Apify Playground'}>
					{children}
				</TitleFormatterProvider>
			</DocsPreferredVersionContextProvider>
		</DocsVersionProvider>
	);
}
