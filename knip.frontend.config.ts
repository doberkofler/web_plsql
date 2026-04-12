import type {KnipConfig} from 'knip';

const config: KnipConfig = {
	$schema: 'https://unpkg.com/knip@5/schema.json',
	entry: [],
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
		'conventional-changelog-angular',
		'chalk',
		'slice-ansi',
		'string-width',
	],
};

export default config;