import process from 'node:process';
import chalk from 'chalk';

// Named aliases — chalk 16-color approximations, original ansi256 noted
const C = {
	red: chalk.redBright.bold, // ansi256(196)
	gray: chalk.gray, // ansi256(245)
	dimGray: chalk.blackBright, // ansi256(240)
	white: chalk.whiteBright, // ansi256(255)
} as const;

/**
 * Prints a formatted CLI error block to stderr with timestamp.
 *
 * @param message - Primary error description
 * @param meta - Optional metadata
 */
export const printError = (message: string, meta?: Record<string, string>): void => {
	const ts = new Date()
		.toISOString()
		.replace('T', ' ')
		.replace(/(\.\d{3})Z$/, '.$1 UTC');

	const sep = C.dimGray('─'.repeat(48));
	const header = `${C.red('✖ ERROR')}  ${C.dimGray(ts)}`;
	const body = C.white(message);

	const defaultMeta: Record<string, string> = {
		pid: String(process.pid),
		node: process.version,
		...meta,
	};

	const footer = Object.entries(defaultMeta)
		.map(([k, v]) => `${C.dimGray(k)} ${C.gray(v)}`)
		.join('  ');

	console.error([sep, header, body, sep, footer].join('\n'));
};