import type {StatusResponse} from '../schemas.js';

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
        <div class="card card-clickable transition-all duration-200">
            <div class="card-header">
                <span class="material-symbols-rounded">database</span>
                <h3>${p.name}</h3>
            </div>
            <div class="mb-4">
                <div class="flex justify-between items-baseline mb-2">
                    <span class="text-3xl font-bold text-bright">${utilization}%</span>
                    <span class="text-main">${p.connectionsInUse} / ${p.connectionsOpen}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill transition-all duration-300" style="width: ${utilization}%; background: ${utilColor}"></div>
                </div>
                <small class="description mt-2 block">Utilization (Active / Open Connections)</small>
            </div>
            ${
				stats
					? `
                <div class="mt-4 pt-4 border-t">
                    <div class="stat-row">
                        <span class="stat-row-label">Requests</span>
                        <span class="stat-row-value">${stats.totalRequests.toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-row-label">Timeouts</span>
                        <span class="stat-row-value">${stats.totalTimeouts.toLocaleString()}</span>
                    </div>
                </div>
            `
					: ''
			}
        </div>
    `;
}
