import {Chart, registerables} from 'chart.js';
import type {State, ChartInstance} from '../js/types.js';
import type {StatusResponse} from '../js/schemas.js';

// Register Chart.js components
Chart.register(...registerables);

type PoolInfo = StatusResponse['pools'][number];

/**
 * Chart colors based on theme mode.
 */
type ChartColors = {
	gridColor: string;
	textColor: string;
};

/**
 * Get chart colors for the current theme.
 * @param isDark - Whether dark mode is active.
 * @returns Chart color configuration.
 */
function getChartColors(isDark: boolean): ChartColors {
	return {
		gridColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
		textColor: isDark ? '#94a3b8' : '#475569',
	};
}

/**
 * Initialize charts.
 * @param state - Application state.
 */
export function initCharts(state: State): void {
	const isDark = document.body.classList.contains('dark');
	const colors = getChartColors(isDark);

	const trafficEl = document.getElementById('traffic-chart') as HTMLCanvasElement | null;
	if (trafficEl) {
		const chartData = {
			labels: [],
			datasets: [
				{
					label: 'Requests/s',
					data: [],
					borderColor: '#3b82f6',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					fill: true,
					tension: 0.4,
					yAxisID: 'y',
				},
				{
					label: 'Errors/s',
					data: [],
					borderColor: '#ef4444',
					backgroundColor: 'rgba(239, 68, 68, 0.1)',
					fill: true,
					tension: 0.4,
					yAxisID: 'y1',
				},
			],
		};

		const chartOptions = {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				x: {
					grid: {color: colors.gridColor},
					ticks: {color: colors.textColor, display: false},
				},
				y: {
					type: 'linear' as const,
					display: true,
					position: 'left' as const,
					grid: {color: colors.gridColor},
					ticks: {color: colors.textColor},
					beginAtZero: true,
					title: {
						display: true,
						text: 'Requests/s',
						color: colors.textColor,
					},
				},
				y1: {
					type: 'linear' as const,
					display: true,
					position: 'right' as const,
					grid: {drawOnChartArea: false, color: colors.gridColor},
					ticks: {color: '#ef4444'},
					beginAtZero: true,
					title: {
						display: true,
						text: 'Errors/s',
						color: '#ef4444',
					},
				},
			},
			plugins: {
				legend: {
					labels: {color: colors.textColor},
				},
			},
		};

		const chart = new Chart(trafficEl, {
			type: 'line',
			data: chartData,
			options: chartOptions,
		});

		state.charts.traffic = {
			data: chartData,
			options: chartOptions,
			update: () => chart.update(),
		} as ChartInstance;
	}

	const poolEl = document.getElementById('pool-chart') as HTMLCanvasElement | null;
	if (poolEl) {
		const chartData = {
			labels: [],
			datasets: [],
		};

		const chartOptions = {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				x: {
					grid: {color: colors.gridColor},
					ticks: {color: colors.textColor, display: false},
				},
				y: {
					grid: {color: colors.gridColor},
					ticks: {color: colors.textColor},
					beginAtZero: true,
					title: {
						display: true,
						text: 'Connections',
						color: colors.textColor,
					},
				},
			},
			plugins: {
				legend: {
					labels: {color: colors.textColor},
				},
			},
		};

		const chart = new Chart(poolEl, {
			type: 'line',
			data: chartData,
			options: chartOptions,
		});

		state.charts.pool = {
			data: chartData,
			options: chartOptions,
			update: () => chart.update(),
		} as ChartInstance;
	}
}

/**
 * Update charts with new data.
 * @param state - Application state.
 * @param timeLabel - Time label for the data point.
 * @param reqPerSec - Requests per second.
 * @param errPerSec - Errors per second.
 * @param pools - Pool information.
 */
export function updateCharts(state: State, timeLabel: string, reqPerSec: number, errPerSec: number, pools: PoolInfo[]): void {
	const maxPoints = 30;

	state.history.labels.push(timeLabel);
	state.history.requests.push(reqPerSec);
	state.history.errors.push(errPerSec);

	if (state.history.labels.length > maxPoints) {
		state.history.labels.shift();
		state.history.requests.shift();
		state.history.errors.shift();
	}

	const trafficChart = state.charts.traffic;
	if (trafficChart?.data.datasets[0] && trafficChart.data.datasets[1]) {
		trafficChart.data.labels = state.history.labels;
		trafficChart.data.datasets[0].data = state.history.requests;
		trafficChart.data.datasets[1].data = state.history.errors;
		trafficChart.update();
	}

	const poolChart = state.charts.pool;
	if (poolChart) {
		poolChart.data.labels = state.history.labels;
		pools.forEach((p, i) => {
			const poolName = p.name;
			const history = state.history;
			let usage = history.poolUsage[poolName];
			if (!usage) {
				usage = [];
				history.poolUsage[poolName] = usage;
				const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
				const color = colors[i % colors.length];
				if (color) {
					poolChart.data.datasets.push({
						label: poolName,
						data: usage,
						borderColor: color,
						backgroundColor: undefined,
						fill: undefined,
						tension: 0.4,
					});
				}
			}
			usage.push(p.connectionsInUse);
			if (usage.length > maxPoints) {
				usage.shift();
			}
		});
		poolChart.update();
	}
}
