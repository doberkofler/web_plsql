import {typedApi} from '../api.js';
import {formatDuration, formatDateTime} from '../util/format.js';
import {errorRow, poolCard} from '../templates/index.js';
import {renderConfig} from '../templates/config.js';
import type {State, ServerConfig} from '../types.js';

/**
 * Refresh the error logs view.
 */
export async function refreshErrors(): Promise<void> {
	const logs = await typedApi.getErrorLogs();
	const tbody = document.querySelector('#errors-table tbody');
	if (!tbody) return;

	tbody.innerHTML = logs.map((l) => errorRow(l)).join('');
}

/**
 * Refresh the access logs view.
 */
export async function refreshAccess(): Promise<void> {
	const result = await typedApi.getAccessLogs();
	const el = document.getElementById('access-log-view');
	if (!el) return;

	if (Array.isArray(result)) {
		el.textContent = result.join('\n');
	} else if (result && typeof result === 'object' && 'message' in result) {
		el.textContent = result.message;
	} else {
		el.textContent = 'No logs available';
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
 * Format microseconds to milliseconds.
 *
 * @param microseconds - CPU time in microseconds.
 * @returns Formatted string.
 */
function formatCpuTime(microseconds: number): string {
	const milliseconds = microseconds / 1000;
	return `${milliseconds.toFixed(2)} ms`;
}

/**
 * Refresh the system info view.
 *
 * @param status - The status data.
 */
export function refreshSystem(status: Partial<State['status']>): void {
	const middlewareVersion = document.getElementById('middleware-version');
	if (middlewareVersion && status.version) middlewareVersion.textContent = status.version;

	const nodeVersion = document.getElementById('node-version');
	if (nodeVersion && status.system) nodeVersion.textContent = status.system.nodeVersion;

	const platform = document.getElementById('platform-info');
	if (platform && status.system) platform.textContent = `${status.system.platform} (${status.system.arch})`;

	const systemUptime = document.getElementById('system-uptime');
	if (systemUptime && status.uptime) systemUptime.textContent = formatDuration(status.uptime);

	const systemStartTime = document.getElementById('system-start-time');
	if (systemStartTime && status.startTime) systemStartTime.textContent = formatDateTime(status.startTime);

	const systemStatusText = document.getElementById('system-status-text');
	if (systemStatusText) systemStatusText.textContent = status.status?.toUpperCase() ?? '-';

	const totalRequests = document.getElementById('total-requests');
	if (totalRequests && status.metrics) totalRequests.textContent = status.metrics.requestCount.toLocaleString();

	const totalErrors = document.getElementById('total-errors');
	if (totalErrors && status.metrics) totalErrors.textContent = status.metrics.errorCount.toLocaleString();

	const activePools = document.getElementById('active-pools');
	if (activePools && status.pools) activePools.textContent = status.pools.length.toString();

	// Memory usage
	if (status.system?.memory) {
		const memHeapUsed = document.getElementById('memory-heap-used');
		if (memHeapUsed) memHeapUsed.textContent = formatBytes(status.system.memory.heapUsed);

		const memHeapTotal = document.getElementById('memory-heap-total');
		if (memHeapTotal) memHeapTotal.textContent = formatBytes(status.system.memory.heapTotal);

		const memRss = document.getElementById('memory-rss');
		if (memRss) memRss.textContent = formatBytes(status.system.memory.rss);

		const memExternal = document.getElementById('memory-external');
		if (memExternal) memExternal.textContent = formatBytes(status.system.memory.external);
	}

	// CPU usage
	if (status.system?.cpu) {
		const cpuUser = document.getElementById('cpu-user');
		if (cpuUser) cpuUser.textContent = formatCpuTime(status.system.cpu.user);

		const cpuSystem = document.getElementById('cpu-system');
		if (cpuSystem) cpuSystem.textContent = formatCpuTime(status.system.cpu.system);
	}

	const systemRefreshStatus = document.getElementById('system-refresh-status');
	const autoRefreshToggle = document.getElementById('auto-refresh-toggle') as HTMLInputElement | null;
	const refreshInterval = document.getElementById('refresh-interval') as HTMLSelectElement | null;
	if (systemRefreshStatus && autoRefreshToggle && refreshInterval) {
		if (autoRefreshToggle.checked) {
			const intervalSec = parseInt(refreshInterval.value) / 1000;
			systemRefreshStatus.textContent = `Active (${intervalSec}s)`;
			systemRefreshStatus.classList.add('text-success');
			systemRefreshStatus.classList.remove('text-accent');
		} else {
			systemRefreshStatus.textContent = 'Paused';
			systemRefreshStatus.classList.remove('text-success');
			systemRefreshStatus.classList.add('text-accent');
		}
	}
}
