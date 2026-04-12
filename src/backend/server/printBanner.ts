import chalk from 'chalk';
import stringWidth from 'string-width';
import sliceAnsi from 'slice-ansi';
import {getVersion} from '../version.ts';
import type {configType} from '../types.ts';

// ── TTY
const IS_TTY = process.stdout.isTTY === true;

// ── Icons
// Authoritative form is the hex escape; emoji in comments are for readability only.
// ICON_GEAR uses U+2699 without VS-16 (U+FE0F) intentionally — the variation selector
// forces emoji presentation and makes string-width report width=2. Without it the
// character is "ambiguous" and resolves to width=1 via the ambiguousIsNarrow option below.
const ICON_GLOBE = '\u{1F310}'; // 🌐
const ICON_KEY = '\u{1F511}'; // 🔑
const ICON_DOC = '\u{1F4C4}'; // 📄
const ICON_PACKAGE = '\u{1F4E6}'; // 📦
const ICON_LINK = '\u{1F517}'; // 🔗
const ICON_FOLDER = '\u{1F4C1}'; // 📁
const ICON_GEAR = '\u{1F527}'; // 🔧
const ICON_HOME = '\u{1F3E0}'; // 🏠

// ── Layout
// Each row: │(1) space(1) label(35) sep(1) value(40) space(1) │(1) = 80
const W = 80;
const LABEL_W = 35;
const VALUE_W = W - LABEL_W - 5; // 5 = left-border + left-space + separator + right-space + right-border

const BOX = {
	h: '─',
	v: '│',
	tl: '╭',
	tr: '╮',
	bl: '╰',
	br: '╯',
	ml: '├',
	mr: '┤',
} as const;

/* Returns the visible terminal column-width of `s`. */
const displayWidth = (s: string): number => stringWidth(s, {ambiguousIsNarrow: true});

/* Pads `s` with trailing spaces to `w` visible columns. Returns `s` unchanged if already ≥ `w`. */
const padTo = (s: string, w: number): string => {
	const delta = w - displayWidth(s);
	return delta > 0 ? s + ' '.repeat(delta) : s;
};

/* Truncates `s` to at most `w` visible columns. */
const truncateTo = (s: string, w: number): string => (w > 0 ? sliceAnsi(s, 0, w) : '');

/* Mid-box horizontal divider. */
const divider = (): string => IS_TTY ? chalk.dim(BOX.ml + BOX.h.repeat(W - 2) + BOX.mr) : '-'.repeat(W);

/* Opening border. */
const borderOpen = (): string => IS_TTY ? chalk.dim(BOX.tl + BOX.h.repeat(W - 2) + BOX.tr) : divider();

/* Closing border. */
const borderClose = (): string => IS_TTY ? chalk.dim(BOX.bl + BOX.h.repeat(W - 2) + BOX.br) : divider();

/**
 * Single key/value row.
 * @param key   - Label text.
 * @param value - Display value; null/undefined/empty renders as a dim dash.
 * @param icon  - Optional leading icon (must be a single-cell or double-cell glyph).
 * @returns Formatted string.
 */
const row = (key: string, value: string | number | null | undefined, icon?: string): string => {
	const left = IS_TTY ? (icon ? `${icon} ${key}` : `  ${key}`) : `${key}`;
	const label = padTo(left, LABEL_W);
	const hasValue = value !== null && value !== undefined && value !== '';
	const valueText = hasValue ? String(value) : '—';
	const colorFn = hasValue ? chalk.white : chalk.dim;
	const valueCell = padTo(truncateTo(valueText, VALUE_W), VALUE_W);

	return IS_TTY ? chalk.dim(BOX.v) + ' ' + chalk.dim(label) + ' ' + colorFn(valueCell) + ' ' + chalk.dim(BOX.v) : label + ' ' + valueCell;
};

/**
 * Renders the server startup banner to stdout.
 * @param cfg - Server configuration.
 */
export const printBanner = (cfg: configType): void => {
	const adminRoute = cfg.adminRoute ?? '/admin';
	const baseUrl = `http://localhost:${cfg.port}`;
	const lines: string[] = [];

	// ── top border
	lines.push(borderOpen());

	// ── title
	const title = `NODE PL/SQL SERVER ${getVersion()}`;
	const pad = W - 2 - displayWidth(title);
	lines.push(IS_TTY ? chalk.dim(BOX.v) + ' '.repeat(Math.floor(pad / 2)) + chalk.bold.cyan(title) + ' '.repeat(Math.ceil(pad / 2)) + chalk.dim(BOX.v) : title);
	lines.push(divider());

	// ── server
	lines.push(row('Port', cfg.port, ICON_GLOBE));
	lines.push(row('Admin route', `${adminRoute}${cfg.adminUser ? ' (authenticated)' : ''}`, ICON_KEY));
	lines.push(row('Access log', cfg.loggerFilename, ICON_DOC));
	lines.push(row('Upload limit', typeof cfg.uploadFileSizeLimit === 'number' ? `${cfg.uploadFileSizeLimit} bytes` : null, ICON_PACKAGE));
	lines.push(divider());

	// ── connection pool
	lines.push(row('Oracle pool  min', cfg.oracle.poolMin, ICON_LINK));
	lines.push(row('Oracle pool  max', cfg.oracle.poolMax, ICON_LINK));
	lines.push(row('Oracle pool  increment', cfg.oracle.poolIncrement, ICON_LINK));

	// ── static routes
	if (cfg.routeStatic.length > 0) {
		lines.push(divider());
		cfg.routeStatic.forEach((r, i) => {
			lines.push(row(`Static route #${i + 1}  route`, r.route, ICON_FOLDER));
			lines.push(row(`Static route #${i + 1}  path`, r.directoryPath));
		});
	}

	// ── PL/SQL routes
	if (cfg.routePlSql.length > 0) {
		lines.push(divider());
		cfg.routePlSql.forEach((r, i) => {
			const txMode = typeof r.transactionMode === 'string' ? r.transactionMode : r.transactionMode ? 'custom' : '';
			const n = `PL/SQL route #${i + 1}`;

			lines.push(row(`${n}  route`, r.route, ICON_GEAR));
			lines.push(row(`${n}  Oracle user`, r.user));
			lines.push(row(`${n}  Oracle server`, r.connectString));
			lines.push(row(`${n}  document table`, r.documentTable));
			lines.push(row(`${n}  default page`, r.defaultPage));
			lines.push(row(`${n}  path alias`, r.pathAlias ?? ''));
			lines.push(row(`${n}  path alias proc`, r.pathAliasProcedure ?? ''));
			lines.push(row(`${n}  exclusion list`, r.exclusionList?.join(', ') ?? ''));
			lines.push(row(`${n}  validation fn`, r.requestValidationFunction ?? ''));
			lines.push(row(`${n}  session mode`, txMode));
			lines.push(row(`${n}  auth`, typeof r.auth === 'string' ? r.auth : ''));
			lines.push(row(`${n}  error style`, r.errorStyle));
		});
	}

	// ── footer: quick-access URLs
	lines.push(divider());
	lines.push(row('Admin console', `${baseUrl}${adminRoute}`, ICON_HOME));
	cfg.routePlSql.forEach((r) => {
		lines.push(row(r.route, `${baseUrl}${r.route}`, ICON_GEAR));
	});
	lines.push(borderClose());

	console.log(lines.join('\n'));
};