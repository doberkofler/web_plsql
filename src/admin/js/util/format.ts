/**
 * Format a duration in seconds to a human-readable string.
 * @param {number} seconds - Duration in seconds.
 * @returns {string} Formatted duration string (e.g., "2d 3h 45m 30s").
 */
export function formatDuration(seconds: number): string {
	const d = Math.floor(seconds / (3600 * 24));
	const h = Math.floor((seconds % (3600 * 24)) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	const parts: string[] = [];
	if (d > 0) parts.push(`${d}d`);
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	parts.push(`${s}s`);
	return parts.join(' ');
}

/**
 * Format an ISO date string to a localized date time string.
 * @param isoDate - ISO date string.
 * @returns Formatted date time string or "-" if invalid.
 */
export function formatDateTime(isoDate: string): string {
	if (!isoDate) return '-';
	return new Date(isoDate).toLocaleString();
}
