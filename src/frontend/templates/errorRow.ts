import type {ErrorLogResponse} from '../schemas.js';

/**
 * Error log row template.
 *
 * @param l - The error log entry.
 * @returns HTML string for the error row.
 */
export function errorRow(l: ErrorLogResponse): string {
	return `
        <tr title="Click to see full error details">
            <td title="Timestamp: ${new Date(l.timestamp).toLocaleString()}">${new Date(l.timestamp).toLocaleString()}</td>
            <td title="Method: ${l.req?.method ?? '-'}"><code>${l.req?.method ?? '-'}</code></td>
            <td title="URL: ${l.req?.url ?? '-'}">${l.req?.url ?? '-'}</td>
            <td title="Click for details: ${l.details?.fullMessage ?? ''}" class="break-all">${l.message}</td>
            <td style="width: 40px; text-align: center; color: var(--accent); opacity: 0.7">
                <span class="material-symbols-rounded">chevron_right</span>
            </td>
        </tr>
    `;
}
