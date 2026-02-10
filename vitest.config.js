import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.{js,ts}'],
		setupFiles: ['./tests/setup.js'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			exclude: ['tests/**', '**/node_modules/**', '**/dist/**', '**/*.config.{js,ts}', '**/coverage/**'],
			thresholds: {
				lines: 98,
				functions: 98,
				statements: 98,
				branches: 88,
			},
		},
	},
});
