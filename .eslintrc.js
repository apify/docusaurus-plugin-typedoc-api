module.exports = {
	root: true,
	extends: ['moon', 'moon/react', 'moon/node'],
	parserOptions: {
		project: ['packages/plugin/tsconfig.json'],
		tsconfigRootDir: __dirname,
	},
	rules: {
		'@typescript-eslint/prefer-nullish-coalescing': 'off',

		// Our components rely on a ton of composition
		'react/jsx-no-literals': 'off',
		'react/jsx-no-useless-fragment': 'off',

		// We refernce TypeDoc kind numbers
		'no-magic-numbers': 'off',

		// All the docusaurus types dont resolve
		'import/no-unresolved': 'off',

		// Docusaurus requires default exported components
		'import/no-default-export': 'off',

		// We import from the default theme but its not a dep
		'import/no-extraneous-dependencies': 'off',
		'unicorn/prefer-ternary': 'off',
		'unicorn/no-abusive-eslint-disable': 'off',
		'no-plusplus': 'off',
		// this is definitely code smell but we have a lot of it in the python transforming script
		'no-param-reassign': 'off',
		complexity: 'off',
	},
};
