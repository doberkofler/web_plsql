// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';
import {inspect} from 'node:util';

/** @typedef {import('typescript-eslint').ConfigWithExtends} ConfigWithExtends */

const DEBUG = false;

/** @type {ConfigWithExtends} */
const config_ignore = {
	ignores: ['**/.*', 'examples/**', 'types/**', 'node_modules/**'],
};

/** @type {ConfigWithExtends} */
const config_global = {
	linterOptions: {
		reportUnusedDisableDirectives: 'warn',
		reportUnusedInlineConfigs: 'warn',
	},
};

/** @type {ConfigWithExtends} */
const config_jsdoc = {
	files: ['src/**/*.{js,ts}'],
	plugins: {jsdoc},
	settings: {
		jsdoc: {
			mode: 'typescript',
		},
	},
	rules: {
		...jsdoc.configs['flat/recommended-error'].rules,
		'jsdoc/lines-before-block': 'off',
		'jsdoc/tag-lines': 'off',
		'jsdoc/require-param-description': 'warn',
		'jsdoc/require-property-description': 'warn',
		'jsdoc/require-returns-description': 'warn',
	},
};

/* * @type {ConfigWithExtends[]} */
const config = [
	config_ignore,
	config_global,
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	config_jsdoc,
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/consistent-type-definitions': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					caughtErrors: 'none',
					argsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/restrict-template-expressions': 'off',
		},
	},
	{
		files: ['tests/**/*.{js,ts}'],
		rules: {
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
		},
	},
];

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const flat_config = tseslint.config(...config);

if (DEBUG) {
	console.log(inspect(flat_config, {depth: 5}));
}

export default flat_config;
