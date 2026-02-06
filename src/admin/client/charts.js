import {Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, Legend, Tooltip} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, Legend, Tooltip);

/**
 * @typedef {import('../js/types.js').PoolInfo} PoolInfo
 * @typedef {import('../js/types.js').State} State
 */

/**
 * Chart Helper
 * @param {State} state - The application state.
 */
export function initCharts(state) {
	const isDark = document.body.classList.contains('dark');
	const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
	const textColor = isDark ? '#94a3b8' : '#475569';

	const commonOptions = {
		responsive: true,
		maintainAspectRatio: false,
		animation: {duration: 0},
		scales: {
			x: {
				grid: {color: gridColor},
				ticks: {color: textColor, display: false},
			},
			y: {
				grid: {color: gridColor},
				ticks: {color: textColor},
				beginAtZero: true,
			},
		},
		plugins: {
			legend: {
				labels: {color: textColor},
			},
		},
	};

	const trafficEl = /** @type {HTMLCanvasElement | null} */ (document.getElementById('traffic-chart'));
	if (trafficEl) {
		state.charts.traffic = new Chart(trafficEl, {
			type: 'line',
			data: {
				labels: [],
				datasets: [
					{
						label: 'Requests/s',
						data: [],
						borderColor: '#3b82f6',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						fill: true,
						tension: 0.4,
					},
				],
			},
			options: commonOptions,
		});
	}

	const errorEl = /** @type {HTMLCanvasElement | null} */ (document.getElementById('error-chart'));
	if (errorEl) {
		state.charts.errors = new Chart(errorEl, {
			type: 'line',
			data: {
				labels: [],
				datasets: [
					{
						label: 'Errors/s',
						data: [],
						borderColor: '#ef4444',
						backgroundColor: 'rgba(239, 68, 68, 0.1)',
						fill: true,
						tension: 0.4,
					},
				],
			},
			options: commonOptions,
		});
	}

	const poolEl = /** @type {HTMLCanvasElement | null} */ (document.getElementById('pool-chart'));
	if (poolEl) {
		state.charts.pool = new Chart(poolEl, {
			type: 'line',
			data: {
				labels: [],
				datasets: [],
			},
			options: commonOptions,
		});
	}
}

/**
 * @param {State} state - The application state.
 * @param {string} timeLabel - The time label for the data point.
 * @param {number} reqPerSec - Requests per second.
 * @param {number} errPerSec - Errors per second.
 * @param {PoolInfo[]} pools - Pool status information.
 */
export function updateCharts(state, timeLabel, reqPerSec, errPerSec, pools) {
	const maxPoints = 30;

	state.history.labels.push(timeLabel);
	state.history.requests.push(reqPerSec);
	state.history.errors.push(errPerSec);

	if (state.history.labels.length > maxPoints) {
		state.history.labels.shift();
		state.history.requests.shift();
		state.history.errors.shift();
	}

	if (state.charts.traffic) {
		const chart = state.charts.traffic;
		chart.data.labels = state.history.labels;
		chart.data.datasets[0].data = state.history.requests;
		chart.update();
	}

	if (state.charts.errors) {
		const chart = state.charts.errors;
		chart.data.labels = state.history.labels;
		chart.data.datasets[0].data = state.history.errors;
		chart.update();
	}

	// Update Pool Chart
	if (state.charts.pool) {
		const chart = state.charts.pool;
		chart.data.labels = state.history.labels;
		pools.forEach((p, i) => {
			const poolName = p.name;
			const history = state.history;
			let usage = history.poolUsage[poolName];
			if (!usage) {
				usage = [];
				history.poolUsage[poolName] = usage;
				const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
				chart.data.datasets.push({
					label: poolName,
					data: usage,
					borderColor: colors[i % colors.length],
					tension: 0.4,
				});
			}
			usage.push(p.connectionsInUse);
			if (usage.length > maxPoints) {
				usage.shift();
			}
		});
		chart.update();
	}
}
