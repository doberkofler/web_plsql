import {typedApi} from './api.js';
import {initCharts, updateCharts} from '../client/charts.js';
import {formatDuration, formatDateTime} from './util/format.js';
import {initTheme} from './ui/theme.js';
import {refreshErrors, refreshAccess, refreshConfig, refreshPools, refreshSystem} from './ui/views.js';
import type {State} from './types.js';

/**
 * View icons mapping.
 */
const viewIcons: Record<string, string> = {
	overview: 'dashboard',
	errors: 'error',
	access: 'list_alt',
	cache: 'cached',
	pools: 'database',
	config: 'settings',
	system: 'terminal',
};

/**
 * Application state.
 */
const state: State = {
	currentView: 'overview',
	status: {},
	maxHistoryPoints: 30,
	lastRequestCount: 0,
	lastErrorCount: 0,
	lastUpdateTime: Date.now(),
	refreshTimer: null,
	history: {
		labels: [],
		requests: [],
		avgResponseTimes: [],
		poolUsage: {},
	},
	charts: {},
};

/**
 * Clear cache for a pool.
 *
 * @param poolName - The pool name.
 */
export async function clearCache(poolName: string): Promise<void> {
	await typedApi.post('api/cache/clear', {poolName});
	await updateStatus();
}

/**
 * Update server status.
 */
async function updateStatus(): Promise<void> {
	const now = Date.now();
	const newStatus = await typedApi.getStatus();
	state.status = newStatus;

	if (!newStatus.metrics || !newStatus.pools) return;

	const deltaSec = (now - state.lastUpdateTime) / 1000;
	const reqCountDelta = newStatus.metrics.requestCount - state.lastRequestCount;

	const reqPerSec = deltaSec > 0 ? reqCountDelta / deltaSec : 0;
	const avgResponseTime = newStatus.metrics.avgResponseTime;

	state.lastRequestCount = newStatus.metrics.requestCount;
	state.lastErrorCount = newStatus.metrics.errorCount;
	state.lastUpdateTime = now;

	const timeLabel = new Date().toLocaleTimeString();
	updateCharts(state, timeLabel, reqPerSec, avgResponseTime, newStatus.pools);

	const sidebarVersion = document.getElementById('sidebar-version');
	if (sidebarVersion) sidebarVersion.textContent = `v${newStatus.version}`;

	const uptimeVal = document.getElementById('uptime-val');
	if (uptimeVal) uptimeVal.textContent = formatDuration(newStatus.uptime);

	const startTimeVal = document.getElementById('start-time-val');
	if (startTimeVal) startTimeVal.textContent = `Started: ${formatDateTime(newStatus.startTime)}`;

	const reqCount = document.getElementById('req-count');
	if (reqCount) reqCount.textContent = newStatus.metrics.requestCount.toLocaleString();

	const reqPerSecVal = document.getElementById('req-per-sec');
	if (reqPerSecVal) reqPerSecVal.textContent = `${reqPerSec.toFixed(2)} req/s`;

	const avgRespTimeVal = document.getElementById('avg-resp-time');
	if (avgRespTimeVal) avgRespTimeVal.textContent = `Avg: ${avgResponseTime.toFixed(1)}ms`;

	const errCount = document.getElementById('err-count');
	if (errCount) errCount.textContent = newStatus.metrics.errorCount.toLocaleString();

	// Update Cache Overview
	const caches = await typedApi.getCache();
	let totalHits = 0;
	let totalMisses = 0;
	caches.forEach((c) => {
		totalHits += c.procedureNameCache.stats.hits + c.argumentCache.stats.hits;
		totalMisses += c.procedureNameCache.stats.misses + c.argumentCache.stats.misses;
	});
	const totalRequests = totalHits + totalMisses;
	const hitRate = totalRequests > 0 ? Math.round((totalHits / totalRequests) * 100) : 0;

	const cacheHitRateVal = document.getElementById('cache-hit-rate-val');
	if (cacheHitRateVal) {
		cacheHitRateVal.textContent = `${hitRate}%`;
		cacheHitRateVal.style.color = hitRate > 80 ? 'var(--success)' : hitRate > 50 ? 'var(--warning)' : 'var(--danger)';
	}
	const cacheHitsVal = document.getElementById('cache-hits-val');
	if (cacheHitsVal) cacheHitsVal.textContent = totalHits.toLocaleString();
	const cacheMissesVal = document.getElementById('cache-misses-val');
	if (cacheMissesVal) cacheMissesVal.textContent = totalMisses.toLocaleString();

	const dot = document.getElementById('server-status-dot');
	const text = document.getElementById('server-status-text');
	if (dot) dot.className = 'dot ' + newStatus.status;
	if (text) text.textContent = newStatus.status.toUpperCase();

	const btnPause = document.getElementById('btn-pause');
	if (btnPause) btnPause.style.display = newStatus.status === 'running' ? 'flex' : 'none';

	const btnResume = document.getElementById('btn-resume');
	if (btnResume) btnResume.style.display = newStatus.status === 'paused' ? 'flex' : 'none';

	if (state.currentView === 'errors') await refreshErrors();
	if (state.currentView === 'access') await refreshAccess();
	if (state.currentView === 'pools') refreshPools(newStatus);
	if (state.currentView === 'config') refreshConfig(state);
	if (state.currentView === 'system') refreshSystem(newStatus);
}

/**
 * Start the refresh timer.
 */
function startRefreshTimer(): void {
	stopRefreshTimer();
	const checkbox = document.getElementById('auto-refresh-toggle') as HTMLInputElement | null;
	const intervalSelect = document.getElementById('refresh-interval') as HTMLSelectElement | null;
	if (checkbox?.checked && intervalSelect) {
		const interval = parseInt(intervalSelect.value);
		state.refreshTimer = setInterval(() => {
			void updateStatus();
		}, interval);
	}
}

/**
 * Stop the refresh timer.
 */
function stopRefreshTimer(): void {
	if (state.refreshTimer) {
		clearInterval(state.refreshTimer);
		state.refreshTimer = null;
	}
}

/**
 * Update history points labels to be time-based.
 */
function updateHistoryLabels(): void {
	const intervalSelect = document.getElementById('refresh-interval') as HTMLSelectElement | null;
	const historySelect = document.getElementById('chart-history-points') as HTMLSelectElement | null;
	if (!intervalSelect || !historySelect) return;

	const intervalMs = parseInt(intervalSelect.value);
	const points = [30, 60, 120];

	points.forEach((pts, idx) => {
		const option = historySelect.options[idx];
		if (!option) return;

		const totalSeconds = (pts * intervalMs) / 1000;
		let timeStr = '';
		if (totalSeconds < 60) {
			timeStr = `${totalSeconds}s`;
		} else if (totalSeconds < 3600) {
			timeStr = `${Math.round(totalSeconds / 60)} min`;
		} else {
			const hours = totalSeconds / 3600;
			timeStr = hours === Math.round(hours) ? `${hours} hours` : `${hours.toFixed(1)} hours`;
		}
		option.textContent = `Last ${timeStr}`;
	});
}

// Navigation
document.querySelectorAll('nav button').forEach((btnEl) => {
	const btn = btnEl as HTMLButtonElement;
	btn.onclick = async () => {
		const view = btn.dataset.view;
		if (!view) return;
		state.currentView = view;
		document.querySelectorAll('.view').forEach((vEl) => {
			const v = vEl as HTMLElement;
			v.style.display = 'none';
		});
		const viewEl = document.getElementById('view-' + view);
		if (viewEl) viewEl.style.display = 'block';
		document.querySelectorAll('nav button').forEach((b) => b.classList.remove('active'));
		btn.classList.add('active');
		const viewTitleEl = document.getElementById('view-title');
		if (viewTitleEl) {
			// Get text content excluding the icon span
			const textNodes = Array.from(btn.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
			const btnText = textNodes.map((node) => node.textContent?.trim()).join('');
			const icon = viewIcons[view] || 'chevron_right';
			viewTitleEl.innerHTML = `<span class="material-symbols-rounded">${icon}</span>${btnText}`;
		}

		if (view === 'errors') await refreshErrors();
		if (view === 'access') await refreshAccess();
		if (view === 'pools') refreshPools(state.status);
		if (view === 'config') refreshConfig(state);
		if (view === 'system') refreshSystem(state.status);
	};
});

const autoRefreshToggle = document.getElementById('auto-refresh-toggle') as HTMLInputElement | null;
if (autoRefreshToggle) {
	autoRefreshToggle.onchange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		if (target.checked) startRefreshTimer();
		else stopRefreshTimer();
	};
}

const refreshIntervalSelect = document.getElementById('refresh-interval') as HTMLSelectElement | null;
if (refreshIntervalSelect) {
	refreshIntervalSelect.onchange = () => {
		startRefreshTimer();
		updateHistoryLabels();
		refreshSystem(state.status);
	};
}

const chartHistorySelect = document.getElementById('chart-history-points') as HTMLSelectElement | null;
if (chartHistorySelect) {
	chartHistorySelect.onchange = () => {
		state.maxHistoryPoints = parseInt(chartHistorySelect.value);
		// Trim history if needed
		while (state.history.labels.length > state.maxHistoryPoints) {
			state.history.labels.shift();
			state.history.requests.shift();
			state.history.avgResponseTimes.shift();
			Object.values(state.history.poolUsage).forEach((u) => u.shift());
		}
		void updateStatus();
	};
}

const manualRefreshBtn = document.getElementById('manual-refresh');
if (manualRefreshBtn) {
	manualRefreshBtn.onclick = () => {
		void updateStatus();
	};
}

// Server controls
const btnPause = document.getElementById('btn-pause');
if (btnPause) {
	btnPause.onclick = () => {
		void typedApi.post('api/server/pause').then(() => {
			void updateStatus();
		});
	};
}

const btnResume = document.getElementById('btn-resume');
if (btnResume) {
	btnResume.onclick = () => {
		void typedApi.post('api/server/resume').then(() => {
			void updateStatus();
		});
	};
}

const btnStop = document.getElementById('btn-stop');
if (btnStop) {
	btnStop.onclick = () => {
		if (confirm('Stop the server?')) {
			void typedApi.post('api/server/stop');
		}
	};
}

const btnClearAllCache = document.getElementById('btn-clear-all-cache');
if (btnClearAllCache) {
	btnClearAllCache.onclick = async () => {
		if (confirm('Are you sure you want to clear all caches in all pools? This action cannot be undone.')) {
			await typedApi.post('api/cache/clear', {});
			await updateStatus();
		}
	};
}

// Initialize
initTheme(state);
initCharts(state);
updateHistoryLabels();
void updateStatus()
	.then(() => {
		startRefreshTimer();
	})
	.catch(console.error);
