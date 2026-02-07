import type {ErrorLogResponse} from '../schemas.js';

/**
 * Error log row template.
 *
 * @param l - The error log entry.
 * @returns HTML string for the error row.
 */
export function errorRow(l: ErrorLogResponse): string {
	return `
        <tr>
            <td>${new Date(l.timestamp).toLocaleString()}</td>
            <td><code>${l.req?.method ?? '-'}</code></td>
            <td>${l.req?.url ?? '-'}</td>
            <td title="${l.details?.fullMessage ?? ''}">${l.message}</td>
        </tr>
    `;
}
