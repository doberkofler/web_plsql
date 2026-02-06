import {api} from '../api.js';

/**
 * @typedef {import('../types.js').ErrorLog} ErrorLog
 * @typedef {import('../types.js').CacheData} CacheData
 * @typedef {import('../types.js').State} State
 * @typedef {import('../types.js').Status} Status
 */

/**
 * Refresh Errors
 */
export async function refreshErrors() {
	/** @type {ErrorLog[]} */
	const logs = await api.get('api/logs/error');
	const tbody = document.querySelector('#errors-table tbody');
	if (!tbody) return;
	tbody.innerHTML = logs
		.map(
			(l) => `
        <tr>
            <td>${new Date(l.timestamp).toLocaleString()}</td>
            <td><code>${l.req?.method ?? '-'}</code></td>
            <td>${l.req?.url ?? '-'}</td>
            <td title="${l.details?.fullMessage ?? ''}">${l.message}</td>
        </tr>
    `,
		)
		.join('');
}

/**
 * Refresh Access
 */
export async function refreshAccess() {
	/** @type {string[] | {message: string}} */
	const result = await api.get('api/logs/access');
	const el = document.getElementById('access-log-view');
	if (!el) return;

	if (Array.isArray(result)) {
		el.textContent = result.join('\n');
	} else if (result && typeof result === 'object' && 'message' in result) {
		el.textContent = result.message;
	} else {
		el.textContent = 'No logs available';
	}

	// Scroll to bottom
	if (el.parentElement) {
		el.parentElement.scrollTop = el.parentElement.scrollHeight;
	}
}

/**
 * Refresh Cache
 */
export async function refreshCache() {
	/** @type {CacheData[]} */
	const caches = await api.get('api/cache');
	const cont = document.getElementById('cache-container');

	if (!cont) return;
	cont.innerHTML = caches
		.map((c) => {
			const procTotal = c.procedureNameCache.stats.hits + c.procedureNameCache.stats.misses;
			const procHitRate = procTotal > 0 ? Math.round((c.procedureNameCache.stats.hits / procTotal) * 100) : 0;
			const argTotal = c.argumentCache.stats.hits + c.argumentCache.stats.misses;
			const argHitRate = argTotal > 0 ? Math.round((c.argumentCache.stats.hits / argTotal) * 100) : 0;

			return `
        <div class="card">
            <div class="card-header">
                <span class="material-symbols-rounded">cached</span>
                <h3>Pool: ${c.poolName}</h3>
            </div>
            
            <div style="margin-bottom: 24px">
                <div style="display:flex; justify-content:space-between; margin-bottom: 8px">
                    <strong style="color:var(--text-bright)">Procedures</strong>
                    <span style="color:var(--accent); font-weight:700">${procHitRate}% Hit Rate</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-bottom: 12px">
                    <div style="text-align:center; background:var(--bg-main); padding:8px; border-radius:8px">
                        <small>Size</small><br><strong>${c.procedureNameCache.size}</strong>
                    </div>
                    <div style="text-align:center; background:var(--bg-main); padding:8px; border-radius:8px">
                        <small>Hits</small><br><strong style="color:var(--success)">${c.procedureNameCache.stats.hits}</strong>
                    </div>
                    <div style="text-align:center; background:var(--bg-main); padding:8px; border-radius:8px">
                        <small>Misses</small><br><strong style="color:var(--danger)">${c.procedureNameCache.stats.misses}</strong>
                    </div>
                </div>
                <div style="height:4px; background:var(--bg-main); border-radius:2px; overflow:hidden">
                    <div style="width:${procHitRate}%; height:100%; background:var(--success)"></div>
                </div>
            </div>

            <div style="margin-bottom: 24px">
                <div style="display:flex; justify-content:space-between; margin-bottom: 8px">
                    <strong style="color:var(--text-bright)">Arguments</strong>
                    <span style="color:var(--accent); font-weight:700">${argHitRate}% Hit Rate</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-bottom: 12px">
                    <div style="text-align:center; background:var(--bg-main); padding:8px; border-radius:8px">
                        <small>Size</small><br><strong>${c.argumentCache.size}</strong>
                    </div>
                    <div style="text-align:center; background:var(--bg-main); padding:8px; border-radius:8px">
                        <small>Hits</small><br><strong style="color:var(--success)">${c.argumentCache.stats.hits}</strong>
                    </div>
                    <div style="text-align:center; background:var(--bg-main); padding:8px; border-radius:8px">
                        <small>Misses</small><br><strong style="color:var(--danger)">${c.argumentCache.stats.misses}</strong>
                    </div>
                </div>
                <div style="height:4px; background:var(--bg-main); border-radius:2px; overflow:hidden">
                    <div style="width:${argHitRate}%; height:100%; background:var(--success)"></div>
                </div>
            </div>

            <button class="btn btn-warning btn-full" onclick="window['clearCache']('${c.poolName}', 'all')">
                <span class="material-symbols-rounded">delete_sweep</span>
                Clear Pool Cache
            </button>
        </div>
    `;
		})
		.join('');
}

/**
 * Refresh Pools
 * @param {Partial<Status>} status - The application status.
 */
export function refreshPools(status) {
	const poolsCont = document.getElementById('pools-container');
	if (!poolsCont || !status.pools) return;

	poolsCont.innerHTML = status.pools
		.map(
			(p) => `
        <div class="card">
            <div class="card-header">
                <span class="material-symbols-rounded">database</span>
                <h3>${p.name}</h3>
            </div>
            <p>${p.connectionsInUse} / ${p.connectionsOpen}</p>
            <small>Active / Open Connections</small>
            ${
				p.stats
					? `
                <div style="margin-top: 16px; font-size: 0.75rem; color: var(--text-main)">
                    <div style="display:flex; justify-content:space-between"><span>Requests:</span> <span>${p.stats.totalRequests}</span></div>
                    <div style="display:flex; justify-content:space-between"><span>Timeouts:</span> <span>${p.stats.totalTimeouts}</span></div>
                </div>
            `
					: ''
			}
        </div>
    `,
		)
		.join('');
}

/**
 * Render Config Value
 * @param {unknown} value - The value to render.
 * @returns {string} - The HTML string.
 */
function renderConfigValue(value) {
	if (value === undefined || value === null) return '-';

	if (Array.isArray(value)) {
		return `
            <div style="display:flex; flex-direction:column; gap:8px">
                ${value.map((v) => `<div style="padding:8px; background:var(--bg-hover); border-radius:4px; border:1px solid var(--border)">${renderConfigValue(v)}</div>`).join('')}
            </div>
        `;
	}

	if (typeof value === 'object') {
		return `
            <table class="inner-config-table">
                ${Object.entries(value)
					.map(
						([k, v]) => `
                    <tr>
                        <td style="width:120px; font-weight:600; color:var(--text-main)">${k}</td>
                        <td style="font-family:monospace">${typeof v === 'string' && v.includes('***') ? v : JSON.stringify(v)}</td>
                    </tr>
                `,
					)
					.join('')}
            </table>
        `;
	}

	// eslint-disable-next-line @typescript-eslint/no-base-to-string
	return String(value);
}

/**
 * Refresh Config
 * @param {State} state - The application state.
 */
export function refreshConfig(state) {
	const config = state.status.config;
	if (!config) return;

	const cont = document.getElementById('config-view');
	if (!cont) return;
	cont.className = 'config-container';

	const sections = {
		Server: ['port', 'adminRoute', 'adminUser', 'loggerFilename', 'uploadFileSizeLimit'],
		Database: ['routePlSql'],
		Static: ['routeStatic'],
	};

	let html = '<div class="config-view-content"><table class="config-table">';

	// eslint-disable-next-line jsdoc/reject-any-type
	const configRecord = /** @type {Record<string, any>} */ (config);

	for (const [section, keys] of Object.entries(sections)) {
		html += `<tr><td colspan="2" class="config-section-header">${section}</td></tr>`;
		keys.forEach((key) => {
			html += `
                <tr>
                    <td class="config-label">${key}</td>
                    <td class="config-value">${renderConfigValue(configRecord[key])}</td>
                </tr>
            `;
		});
	}

	// Add any other keys not in predefined sections
	const handledKeys = Object.values(sections).flat();
	const otherKeys = Object.keys(configRecord).filter((k) => !handledKeys.includes(k));
	if (otherKeys.length > 0) {
		html += `<tr><td colspan="2" class="config-section-header">Other</td></tr>`;
		otherKeys.forEach((key) => {
			html += `
                <tr>
                    <td class="config-label">${key}</td>
                    <td class="config-value">${renderConfigValue(configRecord[key])}</td>
                </tr>
            `;
		});
	}

	html += '</table></div>';
	cont.innerHTML = html;
}
