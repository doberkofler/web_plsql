// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

export default [
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		plugins: {jsdoc},
		settings: {
			jsdoc: {
				mode: 'typescript',
			},
		},
		languageOptions: {
			globals: {
				...globals.browser,
				Chart: 'readonly',
			},
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			...jsdoc.configs['flat/recommended-error'].rules,
			'jsdoc/require-param-description': 'warn',
			'jsdoc/require-property-description': 'warn',
			'jsdoc/require-returns-description': 'warn',
			'@typescript-eslint/ban-ts-comment': 'error',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
		},
	},
];
