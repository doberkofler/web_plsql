import type {KnipConfig} from 'knip';

const config: KnipConfig = {
	$schema: 'https://unpkg.com/knip@5/schema.json',
	entry: ['src/frontend/main.ts'],
	project: ['src/frontend/**/*.ts'],
	ignore: [],
	ignoreDependencies: [
		'compression',
		'cookie-parser',
		'express-static-gzip',
		'morgan',
		'rotating-file-stream',
		'tailwindcss',
		'@types/compression',
		'@types/cookie-parser',
		'@types/cors',
		'@types/morgan',
		'cors',
		'@eslint/js',
		'globals',
	],
};

export default config;
