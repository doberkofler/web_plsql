/**
 * Format a duration in seconds to a human-readable string.
 * @param seconds - Duration in seconds.
 * @returns Formatted duration string (e.g., "2d 3h 45m 30s").
 */
export function formatDuration(seconds: number): string {
	if (seconds < 1) return formatMs(seconds * 1000);

	const d = Math.floor(seconds / (3600 * 24));
	const h = Math.floor((seconds % (3600 * 24)) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	const parts: string[] = [];
	if (d > 0) parts.push(`${d}d`);
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	if (s > 0 || parts.length === 0) parts.push(`${s}s`);
	return parts.join(' ');
}

/**
 * Format milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds.
 * @returns Formatted string (e.g., "1.23 ms" or "450 μs").
 */
export function formatMs(ms: number): string {
	if (ms === 0) return '0 ms';
	if (ms < 1) {
		const us = ms * 1000;
		return `${us.toFixed(0)} μs`;
	}
	if (ms < 1000) {
		return `${ms.toFixed(2)} ms`;
	}
	return formatDuration(ms / 1000);
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
