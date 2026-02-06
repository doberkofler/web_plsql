import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.js'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['tests/server.js', '**/node_modules/**', '**/dist/**', '**/*.config.{js,ts}', '**/coverage/**'],
		},
	},
});
