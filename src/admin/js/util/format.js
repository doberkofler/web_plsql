/**
 * @param {number} seconds - Duration in seconds.
 * @returns {string} - Formatted duration string.
 */
export function formatDuration(seconds) {
	const d = Math.floor(seconds / (3600 * 24));
	const h = Math.floor((seconds % (3600 * 24)) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	const parts = [];
	if (d > 0) parts.push(`${d}d`);
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	parts.push(`${s}s`);
	return parts.join(' ');
}

/**
 * @param {string} isoDate - ISO date string.
 * @returns {string} - Formatted date time string.
 */
export function formatDateTime(isoDate) {
	if (!isoDate) return '-';
	return new Date(isoDate).toLocaleString();
}
