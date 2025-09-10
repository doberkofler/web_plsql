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
