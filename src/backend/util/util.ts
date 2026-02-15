/**
 * Get duration as human readable string.
 * @param duration - Milliseconds.
 * @returns String.
 */
export const humanDuration = (duration: number): string => {
	if (!Number.isFinite(duration)) return 'invalid';

	const ms = Math.floor(duration % 1000);
	const s = Math.floor((duration / 1000) % 60);
	const m = Math.floor((duration / (1000 * 60)) % 60);
	const h = Math.floor((duration / (1000 * 60 * 60)) % 24);
	const d = Math.floor(duration / (1000 * 60 * 60 * 24));

	const parts = [];
	if (d) parts.push(`${d}d`);
	if (h) parts.push(`${h}h`);
	if (m) parts.push(`${m}m`);
	if (s) parts.push(`${s}s`);
	if (ms || parts.length === 0) parts.push(`${ms}ms`);

	return parts.join(' ');
};

/**
 * Convert a string to a number
 *
 * @param value - The string to convert
 * @returns The number or null if the string could not be converted
 */
export const stringToNumber = (value: unknown): number | null => {
	// is the value already of type number?
	if (typeof value === 'number') {
		return !Number.isNaN(value) && Number.isFinite(value) ? value : null;
	}

	// Test for invalid characters
	// eslint-disable-next-line unicorn/better-regex
	if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:E[+-]?\d+)?$/i.test(value)) {
		return null;
	}

	// Convert value to a number
	return Number(value);
};

/**
 * Convert a string to a integer
 *
 * @param value - The value to convert
 * @returns The integer or null if the string could not be converted
 */
export const stringToInteger = (value: unknown): number | null => {
	// is the value already a "real" integer, we just return the value
	if (typeof value === 'number' && Number.isInteger(value)) {
		return value;
	}

	// try to convert value to a number
	const num = stringToNumber(value);
	if (num === null || !Number.isInteger(num)) {
		return null;
	}

	return num;
};
