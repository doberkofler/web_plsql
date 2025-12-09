/**
 * Get duration as human readable string.
 * @param {number} duration - Milliseconds.
 * @returns {string} String.
 */
export const humanDuration = (duration) => {
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
	if (ms || !parts.length) parts.push(`${ms}ms`);

	return parts.join(' ');
};

/**
 * Convert a string to a number
 *
 * @param {unknown} value - The string to convert
 * @returns {number | null} The number or null if the string could not be converted
 */
export const stringToNumber = (value) => {
	// is the value already of type number?
	if (typeof value === 'number') {
		return !Number.isNaN(value) && Number.isFinite(value) ? value : null;
	}

	// Test for invalid characters
	if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:E[+-]?\d+)?$/i.test(value)) {
		return null;
	}

	// Convert value to a number
	const num = Number(value);
	return Number.isNaN(num) ? null : num;
};

/**
 * Convert a string to a integer
 *
 * @param {unknown} value - The value to convert
 * @returns {number | null} The integer or null if the string could not be converted
 */
export const stringToInteger = (value) => {
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
