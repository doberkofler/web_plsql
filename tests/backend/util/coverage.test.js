import {describe, it, expect, vi} from 'vitest';
import {inspect, getFormattedMessage, toTable} from '../../../src/util/trace.js';
import {StatsManager} from '../../../src/util/statsManager.js';
import {humanDuration, stringToNumber, stringToInteger} from '../../../src/util/util.js';
import {streamToBuffer} from '../../../src/handler/plsql/stream.js';
import {Readable} from 'node:stream';

// Mock node:util to make inspect throw
vi.mock('node:util', async () => {
	const actual = /** @type {any} */ (await vi.importActual('node:util'));
	return {
		...actual,
		default: {
			...actual.default,
			inspect: (/** @type {any} */ val, /** @type {any} */ opts) => {
				if (val?.forceThrow) throw new Error('inspect failed');
				return actual.inspect(val, opts);
			},
		},
		inspect: (/** @type {any} */ val, /** @type {any} */ opts) => {
			if (val?.forceThrow) throw new Error('inspect failed');
			return actual.inspect(val, opts);
		},
	};
});

describe('util coverage - absolute edge cases', () => {
	describe('trace.js', () => {
		it('should hit the final fallback in inspect()', () => {
			const circular = {forceThrow: true};
			// @ts-expect-error - circular reference
			circular.self = circular;

			const result = inspect(circular);
			expect(result).toBe('Unable to convert value to string');
		});

		it('should cover bindTypeToString with various types', () => {
			const m1 = getFormattedMessage(
				/** @type {any} */ ({
					message: 't',
					sql: 's',
					bind: {p: {type: 1, val: 'v'}},
				}),
			);
			expect(m1.text).toContain('1');

			const m2 = getFormattedMessage(
				/** @type {any} */ ({
					message: 't',
					sql: 's',
					bind: {p: {type: {name: 'OBJ'}, val: 'v'}},
				}),
			);
			expect(m2.text).toContain('OBJ');
		});

		it('should cover padCell in toTable', () => {
			const result = toTable(['Col'], [['Val']]);
			expect(result.text).toContain('Col');
			expect(result.text).toContain('Val');
		});
	});

	describe('statsManager.js', () => {
		it('should trigger rotateBucket via interval', async () => {
			vi.useFakeTimers();
			const manager = new StatsManager({sampleSystem: true, intervalMs: 100});
			const spy = vi.spyOn(manager, 'rotateBucket');

			vi.advanceTimersByTime(150);
			expect(spy).toHaveBeenCalled();

			manager.stop();
			vi.useRealTimers();
			await Promise.resolve();
		});
	});

	describe('stream.js', () => {
		it('should reject on stream error', async () => {
			const readable = new Readable({
				read() {
					this.emit('error', new Error('Stream fail'));
				},
			});
			await expect(streamToBuffer(readable)).rejects.toThrow('Stream fail');
		});
	});

	describe('util.js coverage', () => {
		it('humanDuration should handle non-finite', () => {
			expect(humanDuration(Infinity)).toBe('invalid');
			expect(humanDuration(NaN)).toBe('invalid');
		});

		it('stringToNumber should handle edge cases', () => {
			expect(stringToNumber(NaN)).toBeNull();
			expect(stringToNumber(Infinity)).toBeNull();
			expect(stringToNumber({})).toBeNull();
			expect(stringToNumber('abc')).toBeNull();
		});

		it('stringToInteger should handle edge cases', () => {
			expect(stringToInteger(1.5)).toBeNull();
			expect(stringToInteger('1.5')).toBeNull();
			expect(stringToInteger('abc')).toBeNull();
		});
	});
});
