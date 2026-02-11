import {Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend, PieController, ArcElement} from 'chart.js';
import {STATS_INTERVAL_MS} from '../common/constants.ts';
import type {State, ChartInstance, HistoryBucket} from './types.js';
import type {StatusResponse} from './schemas.js';

// Register Chart.js components
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend, PieController, ArcElement);

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

	const memoryEl = document.getElementById('memory-chart') as HTMLCanvasElement | null;
	if (memoryEl) {
		const chartData = {
			labels: [],
			datasets: [
				{
					label: 'Memory Usage (%)',
					data: [],
					backgroundColor: 'rgba(16, 185, 129, 0.1)',
					borderColor: '#10b981',
					borderWidth: 2,
					fill: true,
					tension: 0.4,
				},
			],
		};

		const chartOptions = {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				x: {
					grid: {color: colors.gridColor},
					ticks: {
						display: false,
						color: colors.textColor,
						maxRotation: 0,
						autoSkip: true,
						maxTicksLimit: 10,
					},
					title: {
						display: false,
						text: 'Time',
						color: colors.textColor,
					},
				},
				y: {
					display: true,
					beginAtZero: true,
					max: 100,
					grid: {
						color: colors.gridColor,
					},
					border: {
						display: true,
						color: colors.gridColor,
					},
					ticks: {
						display: true,
						color: colors.textColor,
						stepSize: 25,
						callback: function (value: number | string) {
							return String(value) + '%';
						},
					},
					title: {
						display: false,
						text: 'Memory %',
						color: colors.textColor,
					},
				},
			},
			layout: {
				padding: 0,
			},
			plugins: {
				legend: {display: false},
				tooltip: {
					enabled: true,
					position: 'nearest' as const,
					intersect: false,
				},
			},
		};

		const chart = new Chart(memoryEl, {
			type: 'line',
			data: chartData,
			options: chartOptions,
		});

		state.charts.memory = {
			data: chartData,
			options: chartOptions,
			update: () => chart.update(),
		} as ChartInstance;
	}

	const cpuEl = document.getElementById('cpu-chart') as HTMLCanvasElement | null;
	if (cpuEl) {
		const chartData = {
			labels: [],
			datasets: [
				{
					label: 'CPU Usage (%)',
					data: [],
					backgroundColor: 'rgba(16, 185, 129, 0.1)',
					borderColor: '#10b981',
					borderWidth: 2,
					fill: true,
					tension: 0.4,
				},
			],
		};

		const chartOptions = {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				x: {
					grid: {color: colors.gridColor},
					ticks: {
						display: false,
						color: colors.textColor,
						maxRotation: 0,
						autoSkip: true,
						maxTicksLimit: 10,
					},
					title: {
						display: false,
						text: 'Time',
						color: colors.textColor,
					},
				},
				y: {
					display: true,
					beginAtZero: true,
					max: 100,
					grid: {
						color: colors.gridColor,
					},
					border: {
						display: true,
						color: colors.gridColor,
					},
					ticks: {
						display: true,
						color: colors.textColor,
						stepSize: 25,
						callback: function (value: number | string) {
							return String(value) + '%';
						},
					},
					title: {
						display: false,
						text: 'Cpu %',
						color: colors.textColor,
					},
				},
			},
			layout: {
				padding: 0,
			},
			plugins: {
				legend: {display: false},
				tooltip: {
					enabled: true,
					position: 'nearest' as const,
					intersect: false,
				},
			},
		};

		const chart = new Chart(cpuEl, {
			type: 'line',
			data: chartData,
			options: chartOptions,
		});

		state.charts.cpu = {
			data: chartData,
			options: chartOptions,
			update: () => chart.update(),
		} as ChartInstance;
	}

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
					label: 'Avg Response Time (ms)',
					data: [],
					borderColor: '#10b981',
					backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
					ticks: {
						display: false,
						color: colors.textColor,
						maxRotation: 0,
						autoSkip: true,
						maxTicksLimit: 10,
					},
					title: {
						display: true,
						text: 'Time',
						color: colors.textColor,
					},
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
					ticks: {color: '#10b981'},
					beginAtZero: true,
					title: {
						display: true,
						text: 'Avg Response Time (ms)',
						color: '#10b981',
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
					ticks: {
						display: false,
						color: colors.textColor,
						maxRotation: 0,
						autoSkip: true,
						maxTicksLimit: 10,
					},
					title: {
						display: true,
						text: 'Time',
						color: colors.textColor,
					},
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
 * Hydrate charts and state from server history.
 * @param state - Application state.
 * @param history - Server history buffer.
 */
export function hydrateHistory(state: State, history: HistoryBucket[]): void {
	state.history.labels = [];
	state.history.requests = [];
	state.history.avgResponseTimes = [];
	state.history.p95ResponseTimes = [];
	state.history.p99ResponseTimes = [];
	state.history.cpuUsage = [];
	state.history.memoryUsage = [];
	state.history.poolUsage = {};

	const maxPoints = state.maxHistoryPoints;
	const recentHistory = history.slice(-maxPoints);
	const intervalSec = (state.status.intervalMs ?? STATS_INTERVAL_MS) / 1000;

	recentHistory.forEach((b) => {
		const timeLabel = new Date(b.timestamp).toLocaleTimeString();
		state.history.labels.push(timeLabel);
		state.history.requests.push(b.requests / intervalSec); // Requests per second
		state.history.avgResponseTimes.push(b.durationAvg);
		state.history.p95ResponseTimes ??= [];
		state.history.p95ResponseTimes.push(b.durationP95);
		state.history.p99ResponseTimes ??= [];
		state.history.p99ResponseTimes.push(b.durationP99);

		// Resource usage percentage
		const totalMem = state.status.system?.memory.totalMemory ?? 0;
		state.history.cpuUsage.push(b.system.cpu);
		state.history.memoryUsage.push(totalMem > 0 ? (b.system.rss / totalMem) * 100 : 0);

		b.pools.forEach((p) => {
			state.history.poolUsage[p.name] ??= [];
			state.history.poolUsage[p.name]?.push(p.connectionsInUse);
		});
	});

	const trafficChart = state.charts.traffic;
	if (trafficChart) {
		trafficChart.data.labels = state.history.labels;
		const ds0 = trafficChart.data.datasets[0];
		const ds1 = trafficChart.data.datasets[1];
		if (ds0) ds0.data = state.history.requests;
		if (ds1) ds1.data = state.history.avgResponseTimes;
		trafficChart.update();
	}

	const poolChart = state.charts.pool;
	if (poolChart) {
		poolChart.data.labels = state.history.labels;
		Object.entries(state.history.poolUsage).forEach(([name, usage], i) => {
			let dataset = poolChart.data.datasets.find((ds) => ds.label === name);
			if (!dataset) {
				const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
				const color = colors[i % colors.length] ?? '#3b82f6';
				dataset = {
					label: name,
					data: usage,
					borderColor: color,
					backgroundColor: undefined,
					fill: undefined,
					tension: 0.4,
				};
				poolChart.data.datasets.push(dataset);
			} else {
				dataset.data = usage;
			}
		});
		poolChart.update();
	}

	const memoryChart = state.charts.memory;
	if (memoryChart) {
		memoryChart.data.labels = state.history.labels;
		if (memoryChart.data.datasets[0]) {
			memoryChart.data.datasets[0].data = state.history.memoryUsage;
		}
		memoryChart.update();
	}

	const cpuChart = state.charts.cpu;
	if (cpuChart) {
		cpuChart.data.labels = state.history.labels;
		if (cpuChart.data.datasets[0]) {
			cpuChart.data.datasets[0].data = state.history.cpuUsage;
		}
		cpuChart.update();
	}
}

/**
 * Update charts with new data.
 * @param state - Application state.
 * @param timeLabel - Time label for the data point.
 * @param reqPerSec - Requests per second.
 * @param avgResponseTime - Average response time in ms.
 * @param pools - Pool information.
 */
export function updateCharts(state: State, timeLabel: string, reqPerSec: number, avgResponseTime: number, pools: PoolInfo[]): void {
	const maxPoints = state.maxHistoryPoints;

	state.history.labels.push(timeLabel);
	state.history.requests.push(reqPerSec);
	state.history.avgResponseTimes.push(avgResponseTime);

	// Resource usage percentage
	const totalMem = state.status.system?.memory.totalMemory ?? 0;
	const latestBucket = state.status.history?.[state.status.history.length - 1];
	if (latestBucket) {
		state.history.cpuUsage.push(latestBucket.system.cpu);
		state.history.memoryUsage.push(totalMem > 0 ? (latestBucket.system.rss / totalMem) * 100 : 0);
	} else {
		state.history.cpuUsage.push(0);
		state.history.memoryUsage.push(0);
	}

	if (state.history.labels.length > maxPoints) {
		state.history.labels.shift();
		state.history.requests.shift();
		state.history.avgResponseTimes.shift();
		state.history.cpuUsage.shift();
		state.history.memoryUsage.shift();
	}

	const trafficChart = state.charts.traffic;
	if (trafficChart?.data.datasets[0] && trafficChart.data.datasets[1]) {
		trafficChart.data.labels = state.history.labels;
		trafficChart.data.datasets[0].data = state.history.requests;
		trafficChart.data.datasets[1].data = state.history.avgResponseTimes;
		trafficChart.update();
	}

	const memoryChart = state.charts.memory;
	if (memoryChart?.data.datasets[0]) {
		memoryChart.data.labels = state.history.labels;
		memoryChart.data.datasets[0].data = state.history.memoryUsage;
		memoryChart.update();
	}

	const cpuChart = state.charts.cpu;
	if (cpuChart?.data.datasets[0]) {
		cpuChart.data.labels = state.history.labels;
		cpuChart.data.datasets[0].data = state.history.cpuUsage;
		cpuChart.update();
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
				const color = colors[i % colors.length] ?? '#3b82f6';
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
