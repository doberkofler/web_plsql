import type {StatusResponse} from '../types.js';

type PoolInfo = StatusResponse['pools'][number];

/**
 * Pool card template.
 *
 * @param p - The pool data.
 * @returns HTML string for the pool card.
 */
export function poolCard(p: PoolInfo): string {
	const utilization = p.connectionsOpen > 0 ? Math.round((p.connectionsInUse / p.connectionsOpen) * 100) : 0;
	const utilColor = utilization > 90 ? 'var(--danger)' : utilization > 70 ? 'var(--warning)' : 'var(--success)';

	const stats = p.stats ?? undefined;

	return `
        <div class="card card-clickable transition-all duration-200" title="Connection pool status for ${p.name}">
            <div class="card-header">
                <span class="material-symbols-rounded">database</span>
                <h3 class="text-lg font-bold text-bright">${p.name}</h3>
            </div>
            <div class="mb-6" title="Utilization: ${utilization}% of open connections are currently in use">
                <div class="flex justify-between items-baseline mb-2">
                    <span class="text-3xl font-bold text-bright">${utilization}%</span>
                    <span class="text-main font-mono">${p.connectionsInUse} / ${p.connectionsOpen}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill transition-all duration-300" style="width: ${utilization}%; background: ${utilColor}"></div>
                </div>
                <small class="description mt-2 block opacity-75">Pool Utilization (Active / Open)</small>
            </div>
            
            <div class="stat-row text-sm" title="Total number of connections currently open in the pool">
                <span class="text-xs uppercase font-bold opacity-75">Connections Open</span>
                <span class="font-mono text-accent font-bold">${p.connectionsOpen}</span>
            </div>
            <div class="stat-row text-sm" title="Number of connections currently active and handling requests">
                <span class="text-xs uppercase font-bold opacity-75">Connections In Use</span>
                <span class="font-mono text-accent font-bold">${p.connectionsInUse}</span>
            </div>

            ${
				stats
					? `
                <div class="mt-4 pt-4 border-t">
                    <div class="stat-row text-sm" title="Cumulative number of requests handled by this pool since server start">
                        <span>Total Requests</span>
                        <span class="font-mono text-accent font-bold">${stats.totalRequests.toLocaleString()}</span>
                    </div>
                    <div class="stat-row text-sm" title="Number of requests that timed out waiting for a connection">
                        <span>Total Timeouts</span>
                        <span class="font-mono ${stats.totalTimeouts > 0 ? 'text-danger' : 'text-accent'} font-bold">${stats.totalTimeouts.toLocaleString()}</span>
                    </div>
                </div>
            `
					: ''
			}
        </div>
    `;
}
