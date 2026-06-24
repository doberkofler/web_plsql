import {formatter as defaults} from './oxc.config.ts';

const formatter = {
	ignorePatterns: ['**/.*', 'examples/**', 'docker', 'types/**', 'node_modules/**', 'coverage/**', 'dist/**', '*.md', '*.json', '*.yaml'],
};

const config = {...defaults, ...formatter};

export default config;