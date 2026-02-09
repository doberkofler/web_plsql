import type {TraceEntry} from '../types.js';
import {formatMs} from '../util/format.js';

/**
 * Render a single trace row for the trace table.
 *
 * @param trace - The trace log entry.
 * @returns HTML string.
 */
export function traceRow(trace: TraceEntry): string {
	const time = new Date(trace.timestamp).toLocaleTimeString();
	const statusClass = trace.status === 'success' ? 'text-success' : 'text-danger';

	return `
		<tr class="trace-table-row cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5" data-id="${trace.id}">
			<td class="px-4 py-2 font-mono text-xs text-dim">${time}</td>
			<td class="px-4 py-2 text-dim text-xs truncate max-w-[150px]" title="${trace.source}">${trace.source}</td>
			<td class="px-4 py-2 text-bright font-mono text-xs truncate max-w-[300px]" title="${trace.url}">${trace.url}</td>
			<td class="px-4 py-2 font-bold ${statusClass} text-xs uppercase">${trace.status}</td>
			<td class="px-4 py-2 text-right font-mono text-xs text-dim">${formatMs(trace.duration)}</td>
			<td class="px-4 py-2 text-dim text-xs truncate max-w-[200px]" title="${trace.procedure ?? ''}">${trace.procedure ?? '-'}</td>
		</tr>
	`;
}
