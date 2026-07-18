import type {KnipConfig} from 'knip';

const config: KnipConfig = {
	$schema: 'https://unpkg.com/knip@5/schema.json',
	entry: [],
	project: ['src/frontend/**/*.ts'],
	ignore: [],
	ignoreDependencies: ['express-static-gzip', 'tailwindcss', 'conventional-changelog-angular', 'chalk', 'slice-ansi', 'string-width'],
};

export default config;