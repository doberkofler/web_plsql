// @ts-check

import eslint from '@eslint/js';
import {defineConfig} from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default defineConfig([
	{
		ignores: ['**/.*', 'lib/**', 'node_modules/**', '**/lib/**'],
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
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			// Allow empty functions for chart update stubs
			'@typescript-eslint/no-empty-function': 'off',

			// Disable JSDoc requirements in TypeScript files
			'jsdoc/require-param': 'off',
			'jsdoc/require-param-type': 'off',
			'jsdoc/require-returns-type': 'off',
			'jsdoc/require-param-description': 'off',
			'jsdoc/require-property-description': 'off',
			'jsdoc/require-returns-description': 'off',

			// Allow toString() for logging/debugging
			'@typescript-eslint/no-base-to-string': 'off',

			// Relaxed rules for template literals
			'@typescript-eslint/restrict-template-expressions': 'off',

			// Consistent type definitions
			'@typescript-eslint/consistent-type-definitions': 'off',

			// Unused vars
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					caughtErrors: 'none',
					argsIgnorePattern: '^_',
				},
			],

			// Deprecation warnings
			'@typescript-eslint/no-deprecated': 'warn',

			// Void expression
			'@typescript-eslint/no-confusing-void-expression': 'off',

			// Unnecessary conditions
			'@typescript-eslint/no-unnecessary-condition': 'off',
		},
	},
]);
