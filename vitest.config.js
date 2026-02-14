import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.{js,ts}', 'src/**/*.test.{js,ts}'],
		exclude: ['tests/e2e/**'], // E2E tests run with Playwright, not Vitest
		setupFiles: ['./src/test_setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			exclude: [
				'tests/**',
				'src/backend/integration_test/**',
				'**/node_modules/**',
				'**/dist/**',
				'**/*.config.{js,ts}',
				'**/coverage/**',
				'package.json',
				'package-lock.json',
				'src/backend/handler/plsql/parsePage.ts:144',
				'src/backend/handler/plsql/parsePage.ts:206',
			],
			thresholds: {
				lines: 95,
				functions: 95,
				statements: 95,
				branches: 90,
			},
		},
	},
});
