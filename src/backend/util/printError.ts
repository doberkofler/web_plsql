import process from 'node:process';

/** ANSI escape codes — no external deps */
const C = {
	red: '\x1b[38;5;196m',
	orange: '\x1b[38;5;214m',
	gray: '\x1b[38;5;245m',
	dimGray: '\x1b[38;5;240m',
	white: '\x1b[38;5;255m',
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
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

	const sep = `${C.dimGray}${'─'.repeat(48)}${C.reset}`;

	const header = `${C.red}${C.bold}✖ ERROR${C.reset}  ${C.dimGray}${ts}${C.reset}`;

	const body = `${C.white}${message}${C.reset}`;

	const defaultMeta: Record<string, string> = {
		pid: String(process.pid),
		node: process.version,
		...meta,
	};

	const footer = Object.entries(defaultMeta)
		.map(([k, v]) => `${C.dimGray}${k}${C.reset} ${C.gray}${v}${C.reset}`)
		.join('  ');

	process.stderr.write([sep, header, body, sep, footer, ''].join('\n') + '\n');
};