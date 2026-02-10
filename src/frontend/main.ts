import {typedApi} from './api.js';
import {initCharts, updateCharts, hydrateHistory} from './charts.js';
import {formatDuration, formatDateTime} from './util/format.js';
import {updateMinMaxMetrics} from './util/metrics.js';
import {initTheme} from './ui/theme.js';
import {refreshErrors, refreshTrace, refreshAccess, refreshConfig, refreshPools, refreshSystem, refreshStats} from './ui/views.js';
import {bindLoadingButton, withLoading} from './ui/components.js';
import {STATS_INTERVAL_MS} from '../common/constants.ts';
import type {State, SystemMetrics} from './types.js';
import './tailwind.css';

/**
 * View icons mapping.
 */
const viewIcons: Record<string, string> = {
	overview: 'dashboard',
	trace: 'bolt',
	errors: 'error',
	access: 'list_alt',
	pools: 'database',
	stats: 'query_stats',
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
	lastBucketTimestamp: 0,
	nextRefreshTimeout: null,
	nextRefreshTime: 0,
	countdownInterval: null,
	history: {
		labels: [],
		requests: [],
		avgResponseTimes: [],
		p95ResponseTimes: [],
		p99ResponseTimes: [],
		cpuUsage: [],
		memoryUsage: [],
		poolUsage: {},
	},
	charts: {},
	metricsMin: {},
	metricsMax: {},
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

const STORAGE_KEYS = {
	REFRESH_INTERVAL: 'admin_refresh_interval',
	HISTORY_DURATION: 'admin_history_duration',
	AUTO_REFRESH: 'admin_auto_refresh',
	THEME: 'theme',
	LAST_VIEW: 'admin_last_view',
};

/**
 * Set the UI to offline state.
 *
 * @param error - The error object.
 */
function setOfflineState(error: unknown): void {
	console.error('Connection lost:', error);

	const dot = document.getElementById('server-status-dot');
	const text = document.getElementById('server-status-text');
	if (dot) dot.className = 'dot offline';
	if (text) text.textContent = 'OFFLINE';

	const btnPause = document.getElementById('btn-pause');
	if (btnPause) btnPause.style.display = 'none';

	const btnResume = document.getElementById('btn-resume');
	if (btnResume) btnResume.style.display = 'none';

	// Update system view status if visible
	const systemStatusDot = document.querySelector('#system-status .dot');
	const systemStatusText = document.getElementById('system-status-text');
	if (systemStatusDot) systemStatusDot.className = 'dot offline';
	if (systemStatusText) systemStatusText.textContent = 'OFFLINE';

	// Show offline modal
	const modal = document.getElementById('offline-modal');
	if (modal && modal.style.display !== 'flex') {
		modal.style.display = 'flex';
	}

	// Schedule next attempt in 60s
	scheduleNextRefresh(60000);
	startCountdown(60000);
}

/**
 * Start the countdown timer for the offline modal.
 *
 * @param durationMs - The duration in milliseconds.
 */
function startCountdown(durationMs: number): void {
	if (state.countdownInterval) clearInterval(state.countdownInterval);

	const endTime = Date.now() + durationMs;
	const el = document.getElementById('offline-countdown');
	const btnText = document.getElementById('reconnect-text');

	if (btnText) btnText.textContent = 'Try Reconnect';

	const update = () => {
		if (!el) return;
		const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
		el.textContent = `Retrying in ${remaining}s...`;
		if (remaining <= 0 && state.countdownInterval) {
			clearInterval(state.countdownInterval);
			state.countdownInterval = null;
		}
	};

	update();
	state.countdownInterval = setInterval(update, 1000);
}

/**
 * Stop the countdown timer.
 */
function stopCountdown(): void {
	if (state.countdownInterval) {
		clearInterval(state.countdownInterval);
		state.countdownInterval = null;
	}
	const el = document.getElementById('offline-countdown');
	if (el) el.textContent = '';
}

/**
 * Update server status.
 *
 * @param fullHistory - Whether to fetch full history.
 * @param includeConfig - Whether to fetch server configuration.
 */
async function updateStatus(fullHistory = false, includeConfig = false): Promise<void> {
	// Show spinner if manually triggered or retrying
	const spinner = document.getElementById('reconnect-spinner');
	const icon = document.getElementById('reconnect-icon');
	const btnText = document.getElementById('reconnect-text');

	if (spinner) spinner.style.display = 'inline-block';
	if (icon) icon.style.display = 'none';
	if (btnText) btnText.textContent = 'Connecting...';

	try {
		const now = Date.now();
		const newStatus = await typedApi.getStatus(fullHistory, includeConfig);

		// Check if we were offline
		const modal = document.getElementById('offline-modal');
		const wasOffline = modal?.style.display === 'flex';

		if (wasOffline && modal) {
			modal.style.display = 'none';
			stopCountdown();
		}

		// Reset button state
		if (spinner) spinner.style.display = 'none';
		if (icon) icon.style.display = 'inline-block';
		if (btnText) btnText.textContent = 'Try Reconnect';

		// Hydrate history on first load or if history is provided
		if (newStatus.history && state.history.labels.length === 0) {
			hydrateHistory(state, newStatus.history);
		}

		// Preserve config if not provided in new status
		if (!newStatus.config && state.status.config) {
			newStatus.config = state.status.config;
		}

		state.status = newStatus;

		if (!newStatus.metrics || !newStatus.pools) return;

		// Use server provided interval stats if available
		const latestBucket = newStatus.history?.[newStatus.history.length - 1];
		const intervalSec = (newStatus.intervalMs ?? STATS_INTERVAL_MS) / 1000;
		const reqPerSec = latestBucket ? latestBucket.requests / intervalSec : 0;
		const avgResponseTime = latestBucket ? latestBucket.durationAvg : newStatus.metrics.avgResponseTime;

		state.lastRequestCount = newStatus.metrics.requestCount;
		state.lastErrorCount = newStatus.metrics.errorCount;
		state.lastUpdateTime = now;

		// Update Min/Max metrics
		if (newStatus.system) {
			const sys = newStatus.system;
			const metrics: SystemMetrics = {
				heapUsed: sys.memory.heapUsed,
				heapTotal: sys.memory.heapTotal,
				rss: sys.memory.rss,
				external: sys.memory.external,
				cpuUser: sys.cpu.user,
				cpuSystem: sys.cpu.system,
			};

			updateMinMaxMetrics(metrics, state.metricsMin, state.metricsMax);
		}

		// Only update charts if we have a new bucket from the server
		if (latestBucket && latestBucket.timestamp > state.lastBucketTimestamp) {
			state.lastBucketTimestamp = latestBucket.timestamp;
			const timeLabel = new Date(latestBucket.timestamp).toLocaleTimeString();
			updateCharts(state, timeLabel, reqPerSec, avgResponseTime, newStatus.pools);
		} else if (!latestBucket && state.history.labels.length === 0) {
			// If we have no history yet, initialize with a zero point to avoid empty charts
			const timeLabel = new Date().toLocaleTimeString();
			updateCharts(state, timeLabel, 0, 0, newStatus.pools);
		}

		const sidebarVersion = document.getElementById('sidebar-version');
		if (sidebarVersion) sidebarVersion.textContent = `v${newStatus.version}`;

		const uptimeVal = document.getElementById('uptime-val');
		if (uptimeVal) uptimeVal.textContent = formatDuration(newStatus.uptime);

		const startTimeVal = document.getElementById('start-time-val');
		if (startTimeVal) startTimeVal.textContent = `Started: ${formatDateTime(newStatus.startTime)}`;

		const reqPerSecVal = document.getElementById('req-per-sec');
		if (reqPerSecVal) reqPerSecVal.textContent = reqPerSec.toFixed(2);

		const maxReqPerSecVal = document.getElementById('max-req-per-sec');
		if (maxReqPerSecVal) maxReqPerSecVal.textContent = newStatus.metrics.maxRequestsPerSecond.toFixed(2);

		const avgRespTimeVal = document.getElementById('avg-resp-time');
		if (avgRespTimeVal) avgRespTimeVal.textContent = `${newStatus.metrics.avgResponseTime.toFixed(1)}ms`;

		const maxRespTimeVal = document.getElementById('max-resp-time');
		if (maxRespTimeVal) maxRespTimeVal.textContent = `${newStatus.metrics.maxResponseTime.toFixed(1)}ms`;

		const errCount = document.getElementById('err-count');
		if (errCount) errCount.textContent = newStatus.metrics.errorCount.toLocaleString();

		// Update Cache Overview
		let totalHits = 0;
		let totalMisses = 0;
		newStatus.pools.forEach((p) => {
			if (p.cache) {
				totalHits += p.cache.procedureName.hits + p.cache.argument.hits;
				totalMisses += p.cache.procedureName.misses + p.cache.argument.misses;
			}
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
		if (state.currentView === 'trace') await refreshTrace();
		if (state.currentView === 'pools') refreshPools(newStatus);
		if (state.currentView === 'config') refreshConfig(state);
		if (state.currentView === 'system') refreshSystem(newStatus, state);

		// Schedule next refresh if auto-refresh is on
		if (autoRefreshToggle?.checked && refreshIntervalSelect) {
			const interval = parseInt(refreshIntervalSelect.value);
			scheduleNextRefresh(interval);
		}
	} catch (err) {
		const modal = document.getElementById('offline-modal');
		// Only set offline state if not already shown to avoid resetting the timer repeatedly
		if (modal?.style.display !== 'flex') {
			setOfflineState(err);
		} else {
			// Already offline, reschedule next attempt
			scheduleNextRefresh(60000);
			startCountdown(60000);
			// Reset button state on failure
			if (spinner) spinner.style.display = 'none';
			if (icon) icon.style.display = 'inline-block';
			if (btnText) btnText.textContent = 'Try Reconnect';
		}
	}
}

/**
 * Schedule the next refresh using recursive setTimeout.
 *
 * @param delayMs - Delay in milliseconds.
 */
function scheduleNextRefresh(delayMs: number): void {
	if (state.nextRefreshTimeout) {
		clearTimeout(state.nextRefreshTimeout);
		state.nextRefreshTimeout = null;
	}

	state.nextRefreshTime = Date.now() + delayMs;
	state.nextRefreshTimeout = setTimeout(() => {
		void updateStatus();
	}, delayMs);
}

/**
 * Start the refresh timer (wrapper for compatibility).
 */
function startRefreshTimer(): void {
	const intervalSelect = document.getElementById('refresh-interval') as HTMLSelectElement | null;
	if (intervalSelect) {
		const interval = parseInt(intervalSelect.value);
		scheduleNextRefresh(interval);
	}
}

/**
 * Stop the refresh timer.
 */
function stopRefreshTimer(): void {
	if (state.nextRefreshTimeout) {
		clearTimeout(state.nextRefreshTimeout);
		state.nextRefreshTimeout = null;
	}
}

/**
 * Update history points labels to be time-based.
 */
function updateHistoryLabels(): void {
	const historySelect = document.getElementById('chart-history-points') as HTMLSelectElement | null;
	if (!historySelect) return;

	Array.from(historySelect.options).forEach((option) => {
		const durationSeconds = parseInt(option.value);

		let timeStr = '';
		if (durationSeconds < 60) {
			timeStr = `${durationSeconds}s`;
		} else if (durationSeconds < 3600) {
			timeStr = `${Math.round(durationSeconds / 60)} min`;
		} else {
			const hours = durationSeconds / 3600;
			timeStr = hours === Math.round(hours) ? `${hours} hour${hours > 1 ? 's' : ''}` : `${hours.toFixed(1)} hours`;
		}
		option.textContent = `Last ${timeStr}`;
	});
}

// Navigation
document.querySelectorAll('nav button').forEach((btnEl) => {
	const btn = btnEl as HTMLButtonElement;
	btn.onclick = async () => {
		try {
			const view = btn.dataset.view;
			if (!view) return;
			state.currentView = view;
			localStorage.setItem(STORAGE_KEYS.LAST_VIEW, view);
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
				const icon = viewIcons[view] ?? 'chevron_right';
				viewTitleEl.innerHTML = `<span class="material-symbols-rounded">${icon}</span>${btnText}`;
			}

			if (view === 'errors') await refreshErrors();
			if (view === 'trace') await refreshTrace();
			if (view === 'pools') refreshPools(state.status);
			if (view === 'stats') await refreshStats();
			if (view === 'config') refreshConfig(state);
			if (view === 'system') refreshSystem(state.status, state);
		} catch (err) {
			setOfflineState(err);
		}
	};
});

const autoRefreshToggle = document.getElementById('auto-refresh-toggle') as HTMLInputElement | null;
if (autoRefreshToggle) {
	autoRefreshToggle.onchange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		localStorage.setItem(STORAGE_KEYS.AUTO_REFRESH, String(target.checked));
		if (target.checked) startRefreshTimer();
		else stopRefreshTimer();
	};
}

const refreshIntervalSelect = document.getElementById('refresh-interval') as HTMLSelectElement | null;
if (refreshIntervalSelect) {
	refreshIntervalSelect.onchange = () => {
		localStorage.setItem(STORAGE_KEYS.REFRESH_INTERVAL, refreshIntervalSelect.value);

		// Recalculate maxHistoryPoints for the new interval
		const intervalMs = parseInt(refreshIntervalSelect.value);
		const durationSeconds = parseInt(chartHistorySelect?.value ?? '60');
		state.maxHistoryPoints = Math.max(1, Math.floor(durationSeconds / (intervalMs / 1000)));

		// Clear history to force re-hydration from server on next update
		state.history.labels = [];
		state.history.requests = [];
		state.history.avgResponseTimes = [];
		state.history.cpuUsage = [];
		state.history.memoryUsage = [];
		state.history.poolUsage = {};

		updateHistoryLabels();
		refreshSystem(state.status, state);
		void updateStatus();
	};
}

const chartHistorySelect = document.getElementById('chart-history-points') as HTMLSelectElement | null;
if (chartHistorySelect) {
	chartHistorySelect.onchange = () => {
		localStorage.setItem(STORAGE_KEYS.HISTORY_DURATION, chartHistorySelect.value);
		const intervalSelect = document.getElementById('refresh-interval') as HTMLSelectElement | null;
		if (!intervalSelect) return;
		const intervalMs = parseInt(intervalSelect.value);
		const durationSeconds = parseInt(chartHistorySelect.value);
		state.maxHistoryPoints = Math.max(1, Math.floor(durationSeconds / (intervalMs / 1000)));

		// Clear history to force re-hydration from server on next update
		state.history.labels = [];
		state.history.requests = [];
		state.history.avgResponseTimes = [];
		state.history.cpuUsage = [];
		state.history.memoryUsage = [];
		state.history.poolUsage = {};

		void updateStatus();
	};
}

const manualRefreshBtn = document.getElementById('manual-refresh') as HTMLButtonElement | null;
if (manualRefreshBtn) {
	manualRefreshBtn.onclick = () => {
		void withLoading(manualRefreshBtn, updateStatus);
	};
}

const errorFilterInput = document.getElementById('error-filter') as HTMLInputElement | null;
if (errorFilterInput) {
	errorFilterInput.onkeydown = (e) => {
		if (e.key === 'Enter') void refreshErrors();
	};
}

bindLoadingButton('error-load-btn', refreshErrors);
bindLoadingButton('trace-load-btn', refreshTrace);
bindLoadingButton('access-load-btn', refreshAccess);
bindLoadingButton('stats-load-btn', refreshStats);

const traceFilterInput = document.getElementById('trace-filter') as HTMLInputElement | null;
if (traceFilterInput) {
	traceFilterInput.onkeydown = (e) => {
		if (e.key === 'Enter') void refreshTrace();
	};
}

const traceClearBtn = document.getElementById('trace-clear-btn') as HTMLButtonElement | null;
if (traceClearBtn) {
	traceClearBtn.onclick = async () => {
		if (confirm('Are you sure you want to clear all traces?')) {
			await withLoading(traceClearBtn, async () => {
				await typedApi.clearTraces();
				await refreshTrace();
			});
		}
	};
}

const traceStatusToggle = document.getElementById('trace-status-toggle') as HTMLButtonElement | null;
if (traceStatusToggle) {
	traceStatusToggle.onclick = async () => {
		await withLoading(traceStatusToggle, async () => {
			const {enabled: currentEnabled} = await typedApi.getTraceStatus();
			await typedApi.toggleTrace(!currentEnabled);
			await refreshTrace();
		});
	};
}

const accessFilterInput = document.getElementById('access-filter') as HTMLInputElement | null;
if (accessFilterInput) {
	accessFilterInput.onkeydown = (e) => {
		if (e.key === 'Enter') void refreshAccess();
	};
}

const statsLimitInput = document.getElementById('stats-limit') as HTMLInputElement | null;
if (statsLimitInput) {
	statsLimitInput.onkeydown = (e) => {
		if (e.key === 'Enter') void refreshStats();
	};
}

// Danger Zone Actions
bindLoadingButton('btn-pause', async () => {
	if (confirm('Are you sure you want to pause the server?')) {
		await typedApi.post('api/server/pause');
		await updateStatus();
	}
});

bindLoadingButton('btn-resume', async () => {
	await typedApi.post('api/server/resume');
	await updateStatus();
});

bindLoadingButton('btn-stop', async () => {
	if (confirm('Are you sure you want to STOP the server? This action cannot be undone from the web interface.')) {
		await typedApi.post('api/server/stop');
		alert('Server stop requested. The interface will now become unresponsive.');
	}
});

bindLoadingButton('btn-clear-all-cache', async () => {
	if (confirm('Are you sure you want to clear ALL caches?')) {
		await typedApi.post('api/cache/clear');
		await updateStatus();
	}
});

const btnReconnect = document.getElementById('btn-reconnect') as HTMLButtonElement | null;
if (btnReconnect) {
	btnReconnect.onclick = () => {
		void withLoading(btnReconnect, updateStatus);
	};
}

// Close modal on escape key
window.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') {
		const errorModal = document.getElementById('error-modal');
		if (errorModal) errorModal.style.display = 'none';
		const traceModal = document.getElementById('trace-modal');
		if (traceModal) traceModal.style.display = 'none';
	}
});

// Initialize

// Load persisted settings
const savedRefreshInterval = localStorage.getItem(STORAGE_KEYS.REFRESH_INTERVAL);
if (savedRefreshInterval && refreshIntervalSelect) {
	refreshIntervalSelect.value = savedRefreshInterval;
}

const savedHistoryDuration = localStorage.getItem(STORAGE_KEYS.HISTORY_DURATION);
if (savedHistoryDuration && chartHistorySelect) {
	chartHistorySelect.value = savedHistoryDuration;
}

const savedAutoRefresh = localStorage.getItem(STORAGE_KEYS.AUTO_REFRESH);
if (savedAutoRefresh !== null && autoRefreshToggle) {
	autoRefreshToggle.checked = savedAutoRefresh === 'true';
}

initTheme(state);
initCharts(state);
updateHistoryLabels();

// Apply initial maxHistoryPoints based on loaded settings
if (refreshIntervalSelect && chartHistorySelect) {
	const intervalMs = parseInt(refreshIntervalSelect.value);
	const durationSeconds = parseInt(chartHistorySelect.value);
	state.maxHistoryPoints = Math.max(1, Math.floor(durationSeconds / (intervalMs / 1000)));
}

// Restore last view
const lastView = localStorage.getItem(STORAGE_KEYS.LAST_VIEW);
if (lastView) {
	const btn = document.querySelector<HTMLButtonElement>(`nav button[data-view="${lastView}"]`);
	if (btn) {
		btn.click();
	}
}

void updateStatus(true, true)
	.then(() => {
		if (autoRefreshToggle?.checked) {
			startRefreshTimer();
		}
	})
	.catch(console.error);
