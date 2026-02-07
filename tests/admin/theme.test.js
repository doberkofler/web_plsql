/* eslint-disable no-undef */
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {initTheme} from '../../src/admin/js/ui/theme.js';

describe('Theme Management', () => {
	/** @type {{onclick: ((e: object) => void) | null}} */
	let mockBtn;
	/** @type {import('../../src/admin/js/types.js').State} */
	let state;
	/** @type {import('vitest').Mock} */
	let setItemMock;

	beforeEach(() => {
		/** @type {Record<string, string>} */
		const storage = {};

		setItemMock = vi.fn().mockImplementation((/** @type {string} */ key, /** @type {string} */ value) => {
			storage[key] = value;
		});

		// Mock localStorage
		vi.stubGlobal('localStorage', {
			getItem: vi.fn().mockImplementation((/** @type {string} */ key) => {
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
					contains: vi.fn().mockImplementation((/** @type {string} */ cls) => {
						const name = document.body.className;
						return typeof name === 'string' && name.includes(cls);
					}),
				},
			},
			getElementById: vi.fn().mockImplementation((/** @type {string} */ id) => {
				if (id === 'theme-toggle-btn') {
					return mockBtn;
				}
				return null;
			}),
		});

		mockBtn = {
			onclick: null,
		};

		state = /** @type {import('../../src/admin/js/types.js').State} */ ({
			charts: {},
		});
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

	it('should toggle theme on button click', () => {
		initTheme(state);
		expect(document.body.className).toBe('dark');

		if (mockBtn.onclick) {
			mockBtn.onclick({});
		}

		expect(document.body.className).toBe('light');
		expect(setItemMock).toHaveBeenCalledWith('theme', 'light');
	});
});
