// @ts-check

import eslint from '@eslint/js';
import {defineConfig} from 'eslint/config';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

export default defineConfig([
	{
		ignores: ['**/.*', 'examples/**', 'types/**', 'node_modules/**', 'coverage/**', 'lib/**', 'src/admin/lib/**'],
	},

	{
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
			reportUnusedInlineConfigs: 'error',
		},
	},

	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		files: ['src/admin/**/*.js'],
		languageOptions: {
			globals: {
				...globals.browser,
			},
		},
		rules: {
			'@typescript-eslint/no-unsafe-call': 'off',
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
		files: ['src/admin/**/*.ts'],
		rules: {
			// Disable JSDoc type requirements in TypeScript files
			'jsdoc/require-param-type': 'off',
			'jsdoc/require-returns-type': 'off',
		},
	},
	{
		files: ['tests/**/*.{js,ts}'],
		rules: {
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/dot-notation': 'off',
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
		},
	},
]);
