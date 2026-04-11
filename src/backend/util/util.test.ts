import {assert, describe, it} from 'vitest';
import {humanDuration, stringToNumber, stringToInteger, centerText} from '../../../src/backend/util/util.ts';

const TESTS_NUMBER = [
	{value: 0, expectedNumber: 0, expectedInteger: 0},
	{value: 1, expectedNumber: 1, expectedInteger: 1},
	{value: Number.NaN, expectedNumber: null, expectedInteger: null},
	{value: Infinity, expectedNumber: null, expectedInteger: null},
	{value: '0', expectedNumber: 0, expectedInteger: 0},
	{value: '1', expectedNumber: 1, expectedInteger: 1},
	{value: '-1', expectedNumber: -1, expectedInteger: -1},
	{value: '100000', expectedNumber: 100_000, expectedInteger: 100_000},
	{value: '100000.00', expectedNumber: 100_000, expectedInteger: 100_000},
	{value: '100000.', expectedNumber: null, expectedInteger: null},
	{value: '7e7', expectedNumber: 7e7, expectedInteger: 7e7},
	{value: '-7e-7', expectedNumber: -7e-7, expectedInteger: null},
	{value: '0.1', expectedNumber: 0.1, expectedInteger: null},
	{value: '+.1', expectedNumber: 0.1, expectedInteger: null},
	{value: '-.1', expectedNumber: -0.1, expectedInteger: null},
	{value: '0.00001', expectedNumber: 0.000_01, expectedInteger: null},
	{value: '-0.00001', expectedNumber: -0.000_01, expectedInteger: null},
	{value: '', expectedNumber: null, expectedInteger: null},
	{value: ' 0', expectedNumber: null, expectedInteger: null},
	{value: '0 ', expectedNumber: null, expectedInteger: null},
	{value: ' 0 ', expectedNumber: null, expectedInteger: null},
	{value: '1 1', expectedNumber: null, expectedInteger: null},
];

describe('util', () => {
	it('humanDuration', () => {
		assert.strictEqual(humanDuration(Number.NaN), 'invalid');
		assert.strictEqual(humanDuration(Infinity), 'invalid');
		assert.strictEqual(humanDuration(0), '0ms');
		assert.strictEqual(humanDuration(1), '1ms');
		assert.strictEqual(humanDuration(1000), '1s');
		assert.strictEqual(humanDuration(60 * 1000), '1m');
		assert.strictEqual(humanDuration(60 * 60 * 1000), '1h');
		assert.strictEqual(humanDuration(24 * 60 * 60 * 1000), '1d');
		assert.strictEqual(humanDuration(24 * 60 * 60 * 1000 + 60 * 60 * 1000 + 60 * 1000 + 1000), '1d 1h 1m 1s');
	});

	it('stringToNumber', () => {
		TESTS_NUMBER.forEach((test) => {
			const computed = stringToNumber(test.value);
			assert.strictEqual(computed, test.expectedNumber);
		});
		assert.strictEqual(stringToNumber({}), null);
		assert.strictEqual(stringToNumber([]), null);
		assert.strictEqual(stringToNumber(null), null);
		assert.strictEqual(stringToNumber(undefined), null);
	});

	it('stringToInteger', () => {
		TESTS_NUMBER.forEach((test) => {
			const computed = stringToInteger(test.value);
			assert.strictEqual(computed, test.expectedInteger);
		});
	});
});

describe('centerText', () => {
	it('returns string of exactly `width` chars', () => {
		assert.lengthOf(centerText('hi', 10), 10);
	});

	it('splits even padding equally', () => {
		assert.strictEqual(centerText('ab', 6), '  ab  ');
	});

	it('odd padding: extra space on right', () => {
		assert.strictEqual(centerText('a', 4), ' a  ');
	});

	it('no-op when text.length === width', () => {
		assert.strictEqual(centerText('exact', 5), 'exact');
	});

	it('empty string fills with padding', () => {
		assert.strictEqual(centerText('', 4), '    ');
	});

	it('respects custom padding char', () => {
		assert.strictEqual(centerText('x', 5, '-'), '--x--');
	});

	it('custom padding char, odd total: extra on right', () => {
		assert.strictEqual(centerText('x', 4, '-'), '-x--');
	});

	it('throws RangeError when width < text.length', () => {
		assert.throws(() => centerText('toolong', 3), RangeError);
	});

	it('RangeError message contains both values', () => {
		assert.throws(() => centerText('toolong', 3), /width \(3\) < text\.length \(7\)/);
	});
});