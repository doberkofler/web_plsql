// @ts-check

import eslint from '@eslint/js';
import {defineConfig} from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
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
	eslintPluginUnicorn.configs.recommended,
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
			'unicorn/catch-error-name': 'off', // FIXME: should be enabled
			'unicorn/prefer-top-level-await': 'off', // FIXME: should be enabled
			'unicorn/no-array-for-each': 'off', // FIXME: should be enabled
			'unicorn/no-useless-undefined': [
				'error',
				{
					checkArrowFunctionBody: false,
				},
			],
			'unicorn/no-process-exit': 'off', // FIXME: should be enabled
			'unicorn/import-style': 'off', // FIXME: should be enabled
			'unicorn/consistent-existence-index-check': 'off', // FIXME: should be enabled
			'unicorn/escape-case': 'off', // FIXME: should be enabled
			'unicorn/no-hex-escape': 'off', // FIXME: should be enabled
			'unicorn/no-useless-error-capture-stack-trace': 'off', // FIXME: should be enabled
			'unicorn/better-regex': 'warn',
			'unicorn/filename-case': 'off',
			'unicorn/no-nested-ternary': 'off', // NOTE: Cannot be enabled because Prettier would remove the parentheses
			'unicorn/no-immediate-mutation': 'error', // TODO: should be enabled
			'unicorn/no-object-as-default-parameter': 'off', // NOTE: I don't really see the advantage of this rule
			'unicorn/require-array-join-separator': 'error', // TODO: should be enabled
			'unicorn/numeric-separators-style': 'error', // TODO: should be enabled
			'unicorn/prevent-abbreviations': 'off',
			'unicorn/number-literal-case': [
				'error',
				{
					hexadecimalValue: 'lowercase',
				},
			],
			'unicorn/no-null': 'off', // FIXME: should be enabled
			'unicorn/switch-case-braces': 'off', // NOTE: I don't really see the advantage of this rule
			'unicorn/no-array-reduce': 'off', // FIXME: should be enabled
			'unicorn/no-array-sort': 'off', // FIXME: should be enabled
			'unicorn/no-for-loop': 'off', // FIXME: should be enabled
			'unicorn/prefer-at': 'off', // NOTE: Cannot be enabled because it would require a lot of code changes and it's effect is debadable
			'unicorn/prefer-export-from': 'off', // FIXME: should be enabled
			'unicorn/prefer-global-this': 'off', // FIXME: should be enabled
			'unicorn/prefer-includes': 'off', //  // FIXME: should be enabled
			'unicorn/prefer-logical-operator-over-ternary': 'off', // FIXME: should be enabled
			'unicorn/prefer-code-point': 'off', // FIXME: should be enabled
			'unicorn/prefer-date-now': 'off', // FIXME: should be enabled
			'unicorn/prefer-dom-node-dataset': 'off',
			'unicorn/prefer-query-selector': 'off', // FIXME: should be enabled
			'unicorn/prefer-prototype-methods': 'off', // FIXME: should be enabled
			'unicorn/prefer-single-call': 'off', // FIXME: should be enabled
			'unicorn/prefer-spread': 'off', // FIXME: should be enabled
			'unicorn/prefer-string-raw': 'off', // FIXME: should be enabled
			'unicorn/prefer-ternary': 'off', // FIXME: should be enabled
			'unicorn/prefer-type-error': 'off', // FIXME: should be enabled

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
			'unicorn/no-useless-undefined': 'off',
			'unicorn/consistent-function-scoping': 'off',
			'unicorn/no-await-expression-member': 'off',
			'unicorn/prefer-dom-node-append': 'off',
		},
	},
]);
