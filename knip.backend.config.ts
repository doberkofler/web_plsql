import type {KnipConfig} from 'knip';

const config: KnipConfig = {
	$schema: 'https://unpkg.com/knip@5/schema.json',
	entry: ['src/backend/index.ts', 'src/backend/server/server.ts'],
	project: ['src/backend/**/*.ts'],
	ignore: ['src/backend/**/*.test.ts', 'tests/backend/integration/**/*.test.ts'],
	ignoreDependencies: ['chart.js', 'tailwindcss', '@eslint/js', 'globals'],
};

export default config;
