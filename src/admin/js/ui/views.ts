import {typedApi} from '../api.js';
import {formatDuration, formatDateTime, formatMs} from '../util/format.js';
import {errorRow, poolCard} from '../templates/index.js';
import {renderConfig} from '../templates/config.js';
import type {State, ServerConfig, SystemMetrics} from '../types.js';

/**
 * Refresh the error logs view.
 */
export async function refreshErrors(): Promise<void> {
	const logs = await typedApi.getErrorLogs();
	const tbody = document.querySelector('#errors-table tbody');
	const filterInput = document.getElementById('error-filter') as HTMLInputElement | null;
	if (!tbody) return;

	const filter = filterInput?.value.toLowerCase() ?? '';
	const filteredLogs = logs.filter((l) => {
		if (!filter) return true;
		return (
			l.message.toLowerCase().includes(filter) ||
			(l.req?.url?.toLowerCase().includes(filter) ?? false) ||
			(l.req?.method?.toLowerCase().includes(filter) ?? false) ||
			(l.details?.fullMessage?.toLowerCase().includes(filter) ?? false)
		);
	});

	tbody.innerHTML = filteredLogs.map((l) => errorRow(l)).join('');

	// Add click listeners for detail view
	tbody.querySelectorAll('tr').forEach((row, idx) => {
		row.classList.add('errors-table-row');
		row.onclick = () => {
			const log = filteredLogs[idx];
			if (!log) return;
			const modal = document.getElementById('error-modal');
			const content = document.getElementById('error-detail-content');
			if (modal && content) {
				content.textContent = JSON.stringify(log, null, 2);
				modal.style.display = 'flex';
			}
		};
	});
}

/**
 * Refresh the statistical history view.
 *
 * @param status - The status data.
 */
export function refreshStats(status: Partial<State['status']>): void {
	const tbody = document.querySelector('#stats-table tbody');
	const limitSelect = document.getElementById('stats-row-limit') as HTMLSelectElement | null;
	const infoEl = document.getElementById('stats-history-info');
	if (!tbody || !status.history) return;

	const limit = limitSelect ? parseInt(limitSelect.value) : 50;
	const history = [...status.history].reverse();
	const displayed = limit > 0 ? history.slice(0, limit) : history;

	if (infoEl) {
		infoEl.textContent = `Showing latest ${displayed.length} of ${history.length} data points`;
	}

	tbody.innerHTML = displayed
		.map((b) => {
			const time = new Date(b.timestamp).toLocaleTimeString();
			const rss = (b.system.rss / 1024 / 1024).toFixed(1);
			const heap = (b.system.heapUsed / 1024 / 1024).toFixed(1);

			return `
			<tr>
				<td class="font-mono text-xs">${time}</td>
				<td class="text-center font-bold text-bright">${b.requests}</td>
				<td class="text-center font-bold ${b.errors > 0 ? 'text-danger' : 'text-success'}">${b.errors}</td>
				<td class="text-right font-mono">${b.durationMin.toFixed(1)}</td>
				<td class="text-right font-mono text-accent font-bold">${b.durationAvg.toFixed(1)}</td>
				<td class="text-right font-mono text-warning">${b.durationP95.toFixed(1)}</td>
				<td class="text-right font-mono text-danger">${b.durationP99.toFixed(1)}</td>
				<td class="text-right font-mono">${b.durationMax.toFixed(1)}</td>
				<td class="text-right font-mono">${b.system.cpu.toFixed(1)}%</td>
				<td class="text-right font-mono">${rss}</td>
				<td class="text-right font-mono">${heap}</td>
			</tr>
		`;
		})
		.join('');
}

/**
 * Refresh the access logs view.
 */
export async function refreshAccess(): Promise<void> {
	const filterInput = document.getElementById('access-filter') as HTMLInputElement | null;
	const limitInput = document.getElementById('access-limit') as HTMLInputElement | null;

	const filter = filterInput?.value ?? '';
	const limit = limitInput ? parseInt(limitInput.value) : 100;

	const result = await typedApi.getAccessLogs(limit, filter);
	const el = document.getElementById('access-log-view');
	const rangeEl = document.getElementById('access-log-range');
	if (!el) return;

	let logCount = 0;
	if (Array.isArray(result)) {
		el.textContent = result.join('\n');
		logCount = result.length;
	} else if (result && typeof result === 'object' && 'message' in result) {
		el.textContent = result.message;
		logCount = 0;
	} else {
		el.textContent = 'No logs available';
		logCount = 0;
	}

	if (rangeEl) {
		rangeEl.textContent = logCount > 0 ? `Showing last ${logCount} log entries` : 'No logs available';
	}

	if (el.parentElement) {
		el.parentElement.scrollTop = el.parentElement.scrollHeight;
	}
}

/**
 * Refresh the pools view.
 *
 * @param status - The status data.
 */
export function refreshPools(status: Partial<State['status']>): void {
	const poolsCont = document.getElementById('pools-container');
	if (!poolsCont || !status.pools) return;

	poolsCont.innerHTML = status.pools.map((p) => poolCard(p)).join('');
}

/**
 * Refresh the config view.
 *
 * @param state - The application state.
 */
export function refreshConfig(state: State): void {
	const config = state.status.config;
	if (!config) return;

	const cont = document.getElementById('config-view');
	if (!cont) return;

	// Use type assertion to bypass exactOptionalPropertyTypes check if needed
	cont.innerHTML = renderConfig(config as Partial<ServerConfig>);
}

/**
 * Format bytes to human readable format.
 *
 * @param bytes - The number of bytes.
 * @returns Formatted string.
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format microseconds to a human-readable duration.
 *
 * @param microseconds - CPU time in microseconds.
 * @returns Formatted string.
 */
function formatCpuTime(microseconds: number): string {
	return formatMs(microseconds / 1000);
}

/**
 * Refresh the system info view.
 *
 * @param status - The status data.
 * @param _state - The application state.
 */
export function refreshSystem(status: Partial<State['status']>, _state?: State): void {
	const middlewareVersion = document.getElementById('middleware-version');
	if (middlewareVersion && status.version) {
		middlewareVersion.textContent = `${status.version} (${__BUILD_TIME__})`;
		middlewareVersion.title = 'The version of the web_plsql gateway and admin console build time';
	}

	const nodeVersion = document.getElementById('node-version');
	if (nodeVersion && status.system) {
		nodeVersion.textContent = status.system.nodeVersion;
		nodeVersion.title = 'The version of the Node.js runtime';
	}

	const platform = document.getElementById('platform-info');
	if (platform && status.system) {
		platform.textContent = `${status.system.platform} (${status.system.arch})`;
		platform.title = 'The operating system and architecture';
	}

	const systemUptime = document.getElementById('system-uptime');
	if (systemUptime && status.uptime) systemUptime.textContent = formatDuration(status.uptime);

	const systemStartTime = document.getElementById('system-start-time');
	if (systemStartTime && status.startTime) systemStartTime.textContent = formatDateTime(status.startTime);

	const systemStatusText = document.getElementById('system-status-text');
	if (systemStatusText) systemStatusText.textContent = status.status?.toUpperCase() ?? '-';

	const totalRequests = document.getElementById('total-requests');
	if (totalRequests && status.metrics) {
		totalRequests.textContent = status.metrics.requestCount.toLocaleString();
		totalRequests.title = 'Cumulative number of requests handled by the server';
	}

	const totalErrors = document.getElementById('total-errors');
	if (totalErrors && status.metrics) {
		totalErrors.textContent = status.metrics.errorCount.toLocaleString();
		totalErrors.title = 'Cumulative number of failed requests';
	}

	const activePools = document.getElementById('active-pools');
	if (activePools && status.pools) {
		activePools.textContent = status.pools.length.toString();
		activePools.title = 'Number of database connection pools currently active';
	}

	// Memory and CPU usage with Server-provided Min/Max
	if (status.system) {
		const system = status.system;
		const metrics = {
			heapUsed: system.memory.heapUsed,
			heapTotal: system.memory.heapTotal,
			rss: system.memory.rss,
			external: system.memory.external,
			cpuUser: system.cpu.user,
			cpuSystem: system.cpu.system,
		};

		const updateMem = (id: string, key: keyof SystemMetrics, maxKey: keyof typeof system.memory) => {
			const val = metrics[key];
			const max = system.memory[maxKey];
			const el = document.getElementById(id);
			const maxEl = document.getElementById(`${id}-max`);
			if (el) el.textContent = formatBytes(val);
			if (maxEl && typeof max === 'number') maxEl.textContent = formatBytes(max);
		};

		const updateCpu = (id: string, key: keyof SystemMetrics, maxKey?: 'userMax' | 'systemMax') => {
			const val = metrics[key];
			const el = document.getElementById(id);
			if (el) el.textContent = formatCpuTime(val);

			if (maxKey) {
				const max = system.cpu[maxKey];
				const maxEl = document.getElementById(`${id}-max`);
				if (maxEl && typeof max === 'number') maxEl.textContent = formatCpuTime(max);
			}
		};

		updateMem('memory-heap-used', 'heapUsed', 'heapUsedMax');
		updateMem('memory-heap-total', 'heapTotal', 'heapTotalMax');
		updateMem('memory-rss', 'rss', 'rssMax');
		updateMem('memory-external', 'external', 'externalMax');
		updateCpu('cpu-user', 'cpuUser', 'userMax');
		updateCpu('cpu-system', 'cpuSystem', 'systemMax');

		const cpuPercentEl = document.getElementById('cpu-percent');
		if (cpuPercentEl && system.cpu.max !== undefined) {
			const totalPercent = system.cpu.max;
			cpuPercentEl.textContent = `${totalPercent.toFixed(1)}%`;
			cpuPercentEl.title = `Max System CPU usage`;
		}

		const memoryPercentEl = document.getElementById('memory-percent');
		if (memoryPercentEl && system.memory.totalMemory) {
			const pct = (system.memory.rss / system.memory.totalMemory) * 100;
			memoryPercentEl.textContent = `${pct.toFixed(1)}%`;
			memoryPercentEl.title = `System Memory Used relative to Total (${formatBytes(system.memory.totalMemory)})`;
		}

		const cpuCoresInfo = document.getElementById('cpu-cores-info');
		if (cpuCoresInfo && system.cpuCores) {
			cpuCoresInfo.textContent = `${system.cpuCores} Cores`;
		}
	}
}
