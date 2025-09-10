// @ts-check

import eslint from '@eslint/js';
import {defineConfig} from 'eslint/config';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

export default defineConfig([
	{
		ignores: ['**/.*', 'examples/**', 'types/**', 'node_modules/**'],
	},

	{
		linterOptions: {
			reportUnusedDisableDirectives: 'warn',
			reportUnusedInlineConfigs: 'warn',
		},
	},

	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
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
	},
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
			'@typescript-eslint/no-deprecated': 'warn',
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
]);
