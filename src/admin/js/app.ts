import {typedApi} from './api.js';
import {initCharts, updateCharts} from '../client/charts.js';
import {formatDuration, formatDateTime} from './util/format.js';
import {initTheme} from './ui/theme.js';
import {refreshErrors, refreshAccess, refreshCache, refreshConfig, refreshPools, refreshSystem} from './ui/views.js';
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
	lastRequestCount: 0,
	lastErrorCount: 0,
	lastUpdateTime: Date.now(),
	refreshTimer: null,
	history: {
		labels: [],
		requests: [],
		errors: [],
		poolUsage: {},
	},
	charts: {},
};

/**
 * Clear cache for a pool.
 *
 * @param poolName - The pool name.
 * @param type - The cache type to clear.
 */
export async function clearCache(poolName: string, type: string): Promise<void> {
	await typedApi.post('api/cache/clear', {poolName, cacheType: type});
	await refreshCache();
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
	const errCountDelta = newStatus.metrics.errorCount - state.lastErrorCount;

	const reqPerSec = deltaSec > 0 ? reqCountDelta / deltaSec : 0;
	const errPerSec = deltaSec > 0 ? errCountDelta / deltaSec : 0;

	state.lastRequestCount = newStatus.metrics.requestCount;
	state.lastErrorCount = newStatus.metrics.errorCount;
	state.lastUpdateTime = now;

	const timeLabel = new Date().toLocaleTimeString();
	updateCharts(state, timeLabel, reqPerSec, errPerSec, newStatus.pools);

	const uptimeVal = document.getElementById('uptime-val');
	if (uptimeVal) uptimeVal.textContent = formatDuration(newStatus.uptime);

	const startTimeVal = document.getElementById('start-time-val');
	if (startTimeVal) startTimeVal.textContent = `Started: ${formatDateTime(newStatus.startTime)}`;

	const reqCount = document.getElementById('req-count');
	if (reqCount) reqCount.textContent = newStatus.metrics.requestCount.toLocaleString();

	const reqPerSecVal = document.getElementById('req-per-sec');
	if (reqPerSecVal) reqPerSecVal.textContent = `${reqPerSec.toFixed(2)} req/s`;

	const errCount = document.getElementById('err-count');
	if (errCount) errCount.textContent = newStatus.metrics.errorCount.toLocaleString();

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
	if (state.currentView === 'cache') await refreshCache();
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
		if (view === 'cache') await refreshCache();
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

// Initialize
initTheme(state);
initCharts(state);
void updateStatus()
	.then(() => {
		startRefreshTimer();
	})
	.catch(console.error);
