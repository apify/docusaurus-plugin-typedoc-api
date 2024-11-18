import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import typedocApiPlugin from '../../packages/plugin/src/index';

const config: Config = {
  title: '@apify/docusaurus-plugin-typedoc-api',

  // Set the production url of your site here
  url: 'https://nonexistent.apify.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'apify', // Usually your GitHub org/user name.
  projectName: 'docusaurus-plugin-typedoc-api', // Usually your repo name.
  githubHost: 'github.com',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    (context, options) => typedocApiPlugin(
      context,
      {
        ...options as any,
        projectRoot: '.',
        packages: [{ path: '.' }],
        pythonOptions: {
          moduleShortcutsPath: __dirname + '/../python/module_shortcuts.json',
          pythonModulePath: __dirname + '/../python/src',
        }
      },
    ),
  ],

  themeConfig: {
    // Replace with your project's social card
    navbar: {
      title: '@apify/docusaurus-plugin-typedoc-api',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/api',
          label: 'API',
          position: 'left',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
