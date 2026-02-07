import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.{js,ts}'],
		setupFiles: ['./tests/setup.js'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			exclude: ['tests/server.js', '**/node_modules/**', '**/dist/**', '**/*.config.{js,ts}', '**/coverage/**'],
			thresholds: {
				lines: 95,
				functions: 95,
				statements: 95,
				branches: 80,
			},
		},
	},
});
