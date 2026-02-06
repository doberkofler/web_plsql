import {api} from './api.js';
import {initCharts, updateCharts} from '../client/charts.js';
import {formatDuration, formatDateTime} from './util/format.js';
import {initTheme} from './ui/theme.js';
import {refreshErrors, refreshAccess, refreshCache, refreshConfig, refreshPools} from './ui/views.js';

/**
 * @typedef {import('./types.js').State} State
 * @typedef {import('./types.js').Status} Status
 */

/** @type {State} */
const state = {
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
 * Update Status
 */
async function updateStatus() {
	const now = Date.now();
	/** @type {Status} */
	const newStatus = await api.get('api/status');
	state.status = newStatus;

	if (!newStatus.metrics || !newStatus.pools) return;

	// Calculate req/s and err/s
	const deltaSec = (now - state.lastUpdateTime) / 1000;
	const reqCountDelta = newStatus.metrics.requestCount - state.lastRequestCount;
	const errCountDelta = newStatus.metrics.errorCount - state.lastErrorCount;

	const reqPerSec = deltaSec > 0 ? reqCountDelta / deltaSec : 0;
	const errPerSec = deltaSec > 0 ? errCountDelta / deltaSec : 0;

	state.lastRequestCount = newStatus.metrics.requestCount;
	state.lastErrorCount = newStatus.metrics.errorCount;
	state.lastUpdateTime = now;

	// Update Charts
	const timeLabel = new Date().toLocaleTimeString();
	updateCharts(state, timeLabel, reqPerSec, errPerSec, newStatus.pools);

	// Update Overview
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

	// Update Status Indicator
	const dot = document.getElementById('server-status-dot');
	const text = document.getElementById('server-status-text');
	if (dot) dot.className = 'dot ' + newStatus.status;
	if (text) text.textContent = newStatus.status.toUpperCase();

	// Update System buttons
	const btnPause = document.getElementById('btn-pause');
	if (btnPause) btnPause.style.display = newStatus.status === 'running' ? 'flex' : 'none';
	const btnResume = document.getElementById('btn-resume');
	if (btnResume) btnResume.style.display = newStatus.status === 'paused' ? 'flex' : 'none';

	// Refresh current view if needed
	if (state.currentView === 'errors') await refreshErrors();
	if (state.currentView === 'access') await refreshAccess();
	if (state.currentView === 'cache') await refreshCache();
	if (state.currentView === 'pools') refreshPools(newStatus);
	if (state.currentView === 'config') refreshConfig(state);
}

/**
 * Refresh Management
 */
function startRefreshTimer() {
	stopRefreshTimer();
	const checkbox = /** @type {HTMLInputElement | null} */ (document.getElementById('auto-refresh-toggle'));
	const intervalSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById('refresh-interval'));
	if (checkbox?.checked && intervalSelect) {
		const interval = parseInt(intervalSelect.value);
		state.refreshTimer = setInterval(() => {
			void updateStatus();
		}, interval);
	}
}

/**
 * Stop Refresh Timer
 */
function stopRefreshTimer() {
	if (state.refreshTimer) {
		clearInterval(state.refreshTimer);
		state.refreshTimer = null;
	}
}

/**
 * Clear Cache
 * @param {string} poolName - The pool name to clear cache for.
 * @param {string} type - The type of cache to clear.
 */
const clearCache = async (poolName, type) => {
	await api.post('api/cache/clear', {poolName, cacheType: type});
	await refreshCache();
};
// eslint-disable-next-line jsdoc/reject-any-type
/** @type {any} */ (window).clearCache = clearCache;

// Navigation
document.querySelectorAll('nav button').forEach((btnEl) => {
	const btn = /** @type {HTMLButtonElement} */ (btnEl);
	btn.onclick = async () => {
		const view = btn.dataset.view;
		if (!view) return;
		state.currentView = view;
		document.querySelectorAll('.view').forEach((vEl) => {
			const v = /** @type {HTMLElement} */ (vEl);
			v.style.display = 'none';
		});
		const viewEl = document.getElementById('view-' + view);
		if (viewEl) viewEl.style.display = 'block';
		document.querySelectorAll('nav button').forEach((b) => b.classList.remove('active'));
		btn.classList.add('active');
		const viewTitleEl = document.getElementById('view-title');
		if (viewTitleEl) viewTitleEl.textContent = btn.textContent ? btn.textContent.trim() : '';

		if (view === 'errors') await refreshErrors();
		if (view === 'access') await refreshAccess();
		if (view === 'cache') await refreshCache();
		if (view === 'pools') refreshPools(state.status);
		if (view === 'config') refreshConfig(state);
	};
});

const autoRefreshToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('auto-refresh-toggle'));
if (autoRefreshToggle) {
	autoRefreshToggle.onchange = (e) => {
		const target = /** @type {HTMLInputElement} */ (e.target);
		if (target.checked) startRefreshTimer();
		else stopRefreshTimer();
	};
}

const refreshIntervalSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById('refresh-interval'));
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

// Controls
const btnPause = document.getElementById('btn-pause');
if (btnPause) {
	btnPause.onclick = () => {
		void api.post('api/server/pause').then(() => {
			void updateStatus();
		});
	};
}
const btnResume = document.getElementById('btn-resume');
if (btnResume) {
	btnResume.onclick = () => {
		void api.post('api/server/resume').then(() => {
			void updateStatus();
		});
	};
}
const btnStop = document.getElementById('btn-stop');
if (btnStop) {
	btnStop.onclick = () => {
		if (confirm('Stop the server?')) {
			void api.post('api/server/stop');
		}
	};
}

// Init
initTheme(state);
initCharts(state);
void updateStatus()
	.then(() => {
		startRefreshTimer();
	})
	.catch(console.error);
