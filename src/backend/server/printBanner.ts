import chalk from 'chalk';
import stringWidth from 'string-width';
import sliceAnsi from 'slice-ansi';
import {getVersion} from '../version.ts';
import type {configType} from '../types.ts';

const W = 80;
const INNER_W = W - 4;
const LABEL_W = 35;
const VALUE_W = INNER_W - LABEL_W - 1;
const GEAR_ICON = '⚙️ ';

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

/*
 * Returns the visible terminal width of a string.
 */
const displayWidth = (value: string): number => {
	// The gear icon (⚙️) is evaluated as 2 columns by string-width,
	// but it renders as 1 grid cell wide in most terminals (macOS/Linux).
	// We replace it with a 1-cell placeholder ('x') to get accurate measurements.
	const normalized = value.replaceAll('⚙️', 'x');
	return stringWidth(normalized, {ambiguousIsNarrow: true});
};

/*
 * Pads a string to a target visible width.
 */
const padEndDisplay = (value: string, targetWidth: number): string => {
	const pad = targetWidth - displayWidth(value);
	if (pad <= 0) {
		return value;
	}

	return value + ' '.repeat(pad);
};

/*
 * Truncates a string to the target visible width.
 */
const truncateDisplay = (value: string, targetWidth: number): string => {
	if (targetWidth <= 0) {
		return '';
	}

	return sliceAnsi(value, 0, targetWidth);
};

/*
 * Divider (mid-section separator).
 */
const divider = (): string => chalk.dim(BOX.ml + BOX.h.repeat(W - 2) + BOX.mr);

/*
 * Bottom border.
 */
const bottom = (): string => chalk.dim(BOX.bl + BOX.h.repeat(W - 2) + BOX.br);

/*
 * Key/value row inside the box.
 */
const row = (key: string, value: string | number | null | undefined, icon?: string): string => {
	const left = icon ? `${icon} ${key}` : `  ${key}`;
	const label = padEndDisplay(left, LABEL_W);

	const hasValue = value !== null && value !== undefined && value !== '';
	const valueText = hasValue ? String(value) : '—';
	const valueColor = hasValue ? chalk.white : chalk.dim;

	const valueCropped = truncateDisplay(valueText, VALUE_W);
	const valuePadded = padEndDisplay(valueCropped, VALUE_W);

	const inner = chalk.dim(label) + ' ' + valueColor(valuePadded);
	return chalk.dim(BOX.v) + ' ' + inner + ' ' + chalk.dim(BOX.v);
};

/**
 * Renders the server startup banner to stdout.
 * @param config - The config.
 */
export const printBanner = (cfg: configType): void => {
	const lines: string[] = [chalk.dim(BOX.tl + BOX.h.repeat(W - 2) + BOX.tr)];

	// ── header
	{
		const title = `NODE PL/SQL SERVER ${getVersion()}`;
		const pad = W - 2 - title.length;
		const inner = ' '.repeat(Math.floor(pad / 2)) + chalk.bold.cyan(title) + ' '.repeat(Math.ceil(pad / 2));
		lines.push(chalk.dim(BOX.v) + inner + chalk.dim(BOX.v));
	}
	lines.push(divider());

	// ── server
	lines.push(row('Port', cfg.port, '🌐'));
	lines.push(row('Admin route', `${cfg.adminRoute ?? '/admin'}${cfg.adminUser ? ' (authenticated)' : ''}`, '🔑'));
	lines.push(row('Access log', cfg.loggerFilename, '📄'));
	lines.push(row('Upload limit', typeof cfg.uploadFileSizeLimit === 'number' ? `${cfg.uploadFileSizeLimit} bytes` : null, '📦'));
	lines.push(divider());

	// ── pool
	lines.push(row('Oracle pool  min', cfg.oracle.poolMin, '🔗'));
	lines.push(row('Oracle pool  max', cfg.oracle.poolMax, '🔗'));
	lines.push(row('Oracle pool  increment', cfg.oracle.poolIncrement, '🔗'));

	// ── static routes
	if (cfg.routeStatic.length > 0) {
		lines.push(divider());
		cfg.routeStatic.forEach((r, i) => {
			lines.push(row(`Static route #${i + 1}  route`, r.route, '📁'));
			lines.push(row(`Static route #${i + 1}  path`, r.directoryPath));
		});
	}

	// ── plsql routes
	if (cfg.routePlSql.length > 0) {
		lines.push(divider());
		cfg.routePlSql.forEach((r, i) => {
			const transactionMode = typeof r.transactionMode === 'string' ? r.transactionMode : r.transactionMode ? 'custom' : '';

			lines.push(row(`PL/SQL route #${i + 1}  route`, r.route, GEAR_ICON));
			lines.push(row(`PL/SQL route #${i + 1}  Oracle user`, r.user));
			lines.push(row(`PL/SQL route #${i + 1}  Oracle server`, r.connectString));
			lines.push(row(`PL/SQL route #${i + 1}  document table`, r.documentTable));
			lines.push(row(`PL/SQL route #${i + 1}  default page`, r.defaultPage));
			lines.push(row(`PL/SQL route #${i + 1}  path alias`, r.pathAlias ?? ''));
			lines.push(row(`PL/SQL route #${i + 1}  path alias proc`, r.pathAliasProcedure ?? ''));
			lines.push(row(`PL/SQL route #${i + 1}  exclusion list`, r.exclusionList ? r.exclusionList.join(', ') : ''));
			lines.push(row(`PL/SQL route #${i + 1}  validation fn`, r.requestValidationFunction ?? ''));
			lines.push(row(`PL/SQL route #${i + 1}  session mode`, transactionMode));
			lines.push(row(`PL/SQL route #${i + 1}  auth`, typeof r.auth === 'string' ? r.auth : ''));
			lines.push(row(`PL/SQL route #${i + 1}  error style`, r.errorStyle));
		});
	}

	// ── footer: quick-access URLs
	const baseUrl = `http://localhost:${cfg.port}`;
	lines.push(divider());
	lines.push(row('Admin console', `${baseUrl}${cfg.adminRoute ?? '/admin'}`, '🏠'));
	cfg.routePlSql.forEach((r) => {
		lines.push(row(r.route, `${baseUrl}${r.route}`, GEAR_ICON));
	});
	lines.push(bottom());

	console.log(lines.join('\n'));
};