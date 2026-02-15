// @ts-check

import eslint from '@eslint/js';
import {defineConfig} from 'eslint/config';
import tseslint from 'typescript-eslint';
//import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import vitest from '@vitest/eslint-plugin';
import pluginRegExp from 'eslint-plugin-regexp';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

export default defineConfig([
	{
		ignores: ['**/.*', 'examples/**', 'docker', 'types/**', 'node_modules/**', 'coverage/**', 'dist/**'],
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
	//eslintPluginUnicorn.configs.recommended,
	pluginRegExp.configs['flat/recommended'],

	// ================================================================================
	// GENERAL
	// ================================================================================
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
		plugins: {vitest},
		rules: {
			// typescript
			'@typescript-eslint/consistent-type-definitions': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/no-deprecated': 'error',
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					caughtErrors: 'none',
					argsIgnorePattern: '^_',
				},
			],

			// vitest
			...vitest.configs.recommended.rules,
			'vitest/no-conditional-expect': 'off', // NOTE: This rule cannot be observed
			'vitest/valid-title': 'off', // NOTE: This rule does not see to understand variables
			'vitest/expect-expect': 'off', // FIXME: should be enabled

			// unicorn
			/*
			'unicorn/better-regex': 'warn',
			'unicorn/filename-case': 'off',
			'unicorn/no-array-callback-reference': 'off', // TODO: should be enabled
			'unicorn/no-array-for-each': 'off', // TODO: should be enabled
			'unicorn/no-array-reduce': 'off', // TODO: should be enabled
			'unicorn/no-array-sort': 'off', // TODO: should be enabled
			'unicorn/no-console-spaces': 'off', // TODO: should be enabled
			'unicorn/no-for-loop': 'off', // TODO: should be enabled
			'unicorn/no-immediate-mutation': 'off', // TODO: should be enabled
			'unicorn/no-negated-condition': 'off', // TODO: should be enabled
			'unicorn/no-nested-ternary': 'off', // NOTE: Cannot be enabled because Prettier would remove the parentheses
			'unicorn/no-null': 'off', // TODO: should be enabled
			'unicorn/no-object-as-default-parameter': 'off', // NOTE: I don't really see the advantage of this rule
			'unicorn/no-process-exit': 'off', // TODO: should be enabled
			'unicorn/no-this-assignment': 'off', // TODO: should be enabled
			'unicorn/no-useless-promise-resolve-reject': 'off', // TODO: should be enabled
			'unicorn/no-useless-switch-case': 'off', // TODO: should be enabled
			'unicorn/no-useless-undefined': [
				'error',
				{
					checkArrowFunctionBody: false,
				},
			],
			'unicorn/number-literal-case': [
				'error',
				{
					hexadecimalValue: 'lowercase',
				},
			],
			'unicorn/numeric-separators-style': 'off', // TODO: should be enabled
			'unicorn/prefer-at': 'off', // NOTE: Cannot be enabled because it would require a lot of code changes and it's effect is debadable
			'unicorn/prefer-export-from': 'off', // TODO: should be enabled
			'unicorn/prefer-global-this': 'off', // TODO: should be enabled
			'unicorn/prefer-includes': 'off', //  // TODO: should be enabled
			'unicorn/prefer-logical-operator-over-ternary': 'off', // TODO: should be enabled
			'unicorn/prefer-code-point': 'off', // TODO: should be enabled
			'unicorn/prefer-date-now': 'off', // TODO: should be enabled
			'unicorn/prefer-dom-node-dataset': 'off',
			'unicorn/prefer-query-selector': 'off', // TODO: should be enabled
			'unicorn/prefer-prototype-methods': 'off', // TODO: should be enabled
			'unicorn/prefer-single-call': 'off', // TODO: should be enabled
			'unicorn/prefer-spread': 'off', // TODO: should be enabled
			'unicorn/prefer-string-raw': 'off', // TODO: should be enabled
			'unicorn/prefer-ternary': 'off', // TODO: should be enabled
			'unicorn/prefer-type-error': 'off', // TODO: should be enabled
			'unicorn/prevent-abbreviations': 'off',
			'unicorn/require-array-join-separator': 'off', // TODO: should be enabled
			'unicorn/switch-case-braces': 'off',
			*/

			// regexp
			'regexp/no-unused-capturing-group': 'warn',
			'regexp/no-dupe-characters-character-class': 'warn',
			'regexp/no-empty-alternative': 'warn',
			'regexp/no-obscure-range': 'warn',
			'regexp/no-useless-assertions': 'warn',
			'regexp/no-useless-escape': 'warn',
			'regexp/no-useless-non-capturing-group': 'warn',
			'regexp/no-super-linear-backtracking': 'warn',
			'regexp/optimal-quantifier-concatenation': 'warn',
			'regexp/prefer-character-class': 'warn',
			'regexp/prefer-d': 'warn',
			'regexp/prefer-w': 'warn',
			'regexp/strict': 'warn',
			'regexp/use-ignore-case': 'warn',
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
			'jsdoc/require-param-description': 'error',
			'jsdoc/require-property-description': 'error',
			'jsdoc/require-returns-description': 'error',
			'jsdoc/require-param-type': 'off',
			'jsdoc/require-returns-type': 'off',
			'jsdoc/require-property-type': 'off',
			'jsdoc/require-throws-type': 'off',
		},
	},

	// ================================================================================
	// FRONTEND (TYPESCRIPT)
	// ================================================================================
	{
		files: ['src/frontend/**/*.{js,ts}'],
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},

	// ================================================================================
	// UNIT TESTS
	// ================================================================================
	{
		files: ['**/*.test.ts'],
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
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/unbound-method': 'off',
		},
	},
]);
