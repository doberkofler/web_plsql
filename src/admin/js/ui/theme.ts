import type {State, ChartInstance} from '../types.js';

/**
 * Theme colors for charts based on theme mode.
 */
interface ChartColors {
	gridColor: string;
	textColor: string;
}

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
 * Update chart options for theme change.
 * @param chart - Chart instance to update.
 * @param colors - Chart colors for the current theme.
 */
function updateChartForTheme(chart: ChartInstance, colors: ChartColors): void {
	if (!chart.options.scales) return;

	const scales = chart.options.scales;

	if (scales.x) {
		if (scales.x.grid) scales.x.grid.color = colors.gridColor;
		if (scales.x.ticks) scales.x.ticks.color = colors.textColor;
	}

	if (scales.y?.grid) {
		scales.y.grid.color = colors.gridColor;
	}
	if (scales.y?.ticks) {
		scales.y.ticks.color = colors.textColor;
	}

	if (scales.y1?.grid) {
		scales.y1.grid.color = colors.gridColor;
	}
	if (scales.y1?.ticks) {
		scales.y1.ticks.color = colors.textColor;
	}

	if (scales.y?.title) {
		scales.y.title.color = colors.textColor;
	}

	if (scales.y1?.title) {
		scales.y1.title.color = colors.textColor;
	}

	if (chart.options.plugins?.legend?.labels) {
		chart.options.plugins.legend.labels.color = colors.textColor;
	}

	chart.update();
}

/**
 * Initialize theme management.
 * @param state - Application state containing chart instances.
 */
export function initTheme(state: State): void {
	const theme = localStorage.getItem('theme') ?? 'dark';
	const checkbox = document.getElementById('theme-toggle-checkbox') as HTMLInputElement | null;
	if (!checkbox) return;

	document.body.className = theme;
	checkbox.checked = theme === 'dark';

	checkbox.onchange = (e: Event): void => {
		const target = e.target as HTMLInputElement;
		const newTheme = target.checked ? 'dark' : 'light';
		document.body.className = newTheme;
		localStorage.setItem('theme', newTheme);

		const colors = getChartColors(newTheme === 'dark');

		Object.values(state.charts).forEach((chartInstance): void => {
			const chart = chartInstance;
			if (chart?.options) {
				updateChartForTheme(chart, colors);
			}
		});
	};
}
