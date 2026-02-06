/**
 * @typedef {import('../types.js').State} State
 * @typedef {import('../types.js').ChartInstance} ChartInstance
 */

/**
 * Theme Management
 * @param {State} state - The application state.
 */
export function initTheme(state) {
	const theme = localStorage.getItem('theme') ?? 'dark';
	const checkbox = /** @type {HTMLInputElement | null} */ (document.getElementById('theme-toggle-checkbox'));
	if (!checkbox) return;

	document.body.className = theme;
	checkbox.checked = theme === 'dark';

	checkbox.onchange = (e) => {
		const target = /** @type {HTMLInputElement} */ (e.target);
		const newTheme = target.checked ? 'dark' : 'light';
		document.body.className = newTheme;
		localStorage.setItem('theme', newTheme);

		// Update charts if they exist
		Object.values(state.charts).forEach((chartInstance) => {
			const chart = /** @type {ChartInstance | null} */ (chartInstance);
			if (chart?.options) {
				const isDark = newTheme === 'dark';
				const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
				const textColor = isDark ? '#94a3b8' : '#475569';

				const options = chart.options;
				if (options.scales) {
					const scales = options.scales;
					if (scales.x) {
						if (scales.x.grid) scales.x.grid.color = gridColor;
						if (scales.x.ticks) scales.x.ticks.color = textColor;
					}
					if (scales.y) {
						if (scales.y.grid) scales.y.grid.color = gridColor;
						if (scales.y.ticks) scales.y.ticks.color = textColor;
					}
				}
				if (options.plugins?.legend?.labels) {
					options.plugins.legend.labels.color = textColor;
				}
				chart.update();
			}
		});
	};
}
