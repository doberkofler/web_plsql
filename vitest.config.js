import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.{js,ts}', 'src/**/*.test.{js,ts}'],
		exclude: ['tests/e2e/**'], // E2E tests run with Playwright, not Vitest
		setupFiles: ['./tests/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			exclude: ['tests/**', '**/node_modules/**', '**/dist/**', '**/*.config.{js,ts}', '**/coverage/**', 'package.json', 'package-lock.json'],
			thresholds: {
				lines: 99,
				functions: 99,
				statements: 99,
				branches: 90,
			},
		},
	},
});
