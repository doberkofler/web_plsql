import {describe, it, expect, vi, beforeEach} from 'vitest';
import {initTheme} from '../../src/admin/js/ui/theme.js';

describe('Theme Management', () => {
	let mockBtn: {onclick: ((e: object) => void) | null};
	let state: import('../../src/admin/js/types.js').State;
	let setItemMock: import('vitest').Mock;

	beforeEach(() => {
		const storage: Record<string, string> = {};

		setItemMock = vi.fn().mockImplementation((key: string, value: string) => {
			storage[key] = value;
		});

		// Mock localStorage
		vi.stubGlobal('localStorage', {
			getItem: vi.fn().mockImplementation((key: string) => {
				const val = storage[key];
				return typeof val === 'string' ? val : null;
			}),
			setItem: setItemMock,
		});

		// Mock document.body
		vi.stubGlobal('document', {
			body: {
				className: '',
				classList: {
					contains: vi.fn().mockImplementation((cls: string) => {
						const name = document.body.className;
						return typeof name === 'string' && name.includes(cls);
					}),
				},
			},
			getElementById: vi.fn().mockImplementation((id: string) => {
				if (id === 'theme-toggle-btn') {
					return mockBtn;
				}
				return null;
			}),
		});

		mockBtn = {
			onclick: null,
		};

		state = {
			charts: {},
		} as unknown as import('../../src/admin/js/types.js').State;
	});

	it('should initialize with default dark theme', () => {
		initTheme(state);
		expect(document.body.className).toBe('dark');
	});

	it('should initialize with theme from localStorage', () => {
		localStorage.setItem('theme', 'light');
		initTheme(state);
		expect(document.body.className).toBe('light');
	});

	it('should update chart options when theme changes', () => {
		const mockChart = {
			options: {
				scales: {
					x: {
						grid: {color: 'old'},
						ticks: {color: 'old'},
					},
					y: {
						grid: {color: 'old'},
						ticks: {color: 'old'},
						title: {color: 'old'},
					},
					y1: {
						grid: {color: 'old'},
						ticks: {color: 'old'},
						title: {color: 'old'},
					},
				},
				plugins: {
					legend: {
						labels: {color: 'old'},
					},
				},
			},
			update: vi.fn(),
		};

		// Cast to unknown first to bypass type checking for the mock
		state.charts.test = mockChart as unknown as import('../../src/admin/js/types.js').ChartInstance;

		initTheme(state);

		// Simulate click to toggle to light mode
		if (mockBtn.onclick) {
			mockBtn.onclick({});
		}

		const lightColors = {
			gridColor: 'rgba(0,0,0,0.1)',
			textColor: '#475569',
		};

		expect(mockChart.options.scales.x.grid.color).toBe(lightColors.gridColor);
		expect(mockChart.options.scales.x.ticks.color).toBe(lightColors.textColor);
		expect(mockChart.options.scales.y.grid.color).toBe(lightColors.gridColor);
		expect(mockChart.options.scales.y.ticks.color).toBe(lightColors.textColor);
		expect(mockChart.options.scales.y.title.color).toBe(lightColors.textColor);
		expect(mockChart.options.scales.y1.grid.color).toBe(lightColors.gridColor);
		expect(mockChart.options.scales.y1.ticks.color).toBe(lightColors.textColor);
		expect(mockChart.options.scales.y1.title.color).toBe(lightColors.textColor);
		expect(mockChart.options.plugins.legend.labels.color).toBe(lightColors.textColor);
		expect(mockChart.update).toHaveBeenCalled();
	});

	it('should handle chart without scales safely', () => {
		const mockChart = {
			options: {},
			update: vi.fn(),
		};

		state.charts.test = mockChart as unknown as import('../../src/admin/js/types.js').ChartInstance;
		initTheme(state);

		if (mockBtn.onclick) {
			mockBtn.onclick({});
		}

		expect(mockChart.update).not.toHaveBeenCalled();
	});
});
