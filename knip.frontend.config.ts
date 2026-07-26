import type {KnipConfig} from 'knip';

const config: KnipConfig = {
	$schema: 'https://unpkg.com/knip@5/schema.json',
	entry: [],
	project: ['src/frontend/**/*.{ts,css}'],
	ignore: [],
	ignoreFiles: ['src/frontend/style.css'],
	ignoreDependencies: ['express-static-gzip', 'conventional-changelog-angular', 'chalk', 'slice-ansi', 'string-width'],
};

export default config;