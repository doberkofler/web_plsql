import {describe, it, expect, vi, beforeEach} from 'vitest';
import {initTheme} from '../ui/theme.ts';

describe('Theme Management', () => {
	let mockBtn: {
		addEventListener: import('vitest').Mock;
		click: () => void;
	};
	let state: import('../types.ts').State;
	let setItemMock: import('vitest').Mock;

	beforeEach(() => {
		const storage: Record<string, string> = {};
		const eventListeners: Record<string, (() => void)[]> = {};

		setItemMock = vi.fn<(key: string, value: string) => void>().mockImplementation((key: string, value: string) => {
			storage[key] = value;
		});

		// Mock localStorage
		vi.stubGlobal('localStorage', {
			getItem: vi.fn<(key: string) => string | null>().mockImplementation((key: string) => {
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
					contains: vi.fn<(cls: string) => boolean>().mockImplementation((cls: string) => {
						const name = document.body.className;
						return typeof name === 'string' && name.includes(cls);
					}),
				},
			},
			getElementById: vi.fn<(id: string) => typeof mockBtn | null>().mockImplementation((id: string) => {
				if (id === 'theme-toggle-btn') {
					return mockBtn;
				}
				return null;
			}),
		});

		mockBtn = {
			addEventListener: vi.fn<(event: string, callback: () => void) => void>().mockImplementation((event: string, callback: () => void) => {
				if (!eventListeners[event]) {
					eventListeners[event] = [];
				}
				eventListeners[event]?.push(callback);
			}),
			click: () => {
				eventListeners['click']?.forEach((cb) => cb());
			},
		};

		state = {
			charts: {},
		} as unknown as import('../types.ts').State;
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
			update: vi.fn<() => void>(),
		};

		// Cast to unknown first to bypass type checking for the mock
		state.charts.test = mockChart as unknown as import('../types.ts').ChartInstance;

		initTheme(state);

		// Simulate click to toggle to light mode
		mockBtn.click();

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
			update: vi.fn<() => void>(),
		};

		state.charts.test = mockChart as unknown as import('../types.ts').ChartInstance;
		initTheme(state);

		mockBtn.click();

		expect(mockChart.update).not.toHaveBeenCalled();
	});

	it('should handle partial scales safely', () => {
		const mockChart = {
			options: {
				scales: {
					x: {}, // missing grid/ticks
					y: {},
					y1: {},
				},
			},
			update: vi.fn<() => void>(),
		};

		state.charts.test = mockChart as unknown as import('../types.ts').ChartInstance;
		initTheme(state);

		mockBtn.click();

		expect(mockChart.update).toHaveBeenCalled();
	});

	it('should return if button is not found', () => {
		vi.stubGlobal('document', {
			getElementById: vi.fn<(id: string) => null>().mockReturnValue(null),
			body: {className: ''},
		});
		initTheme(state);
		expect(document.body.className).toBe('');
	});
});