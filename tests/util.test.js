import assert from 'node:assert';
import {describe, it} from 'node:test';
import {humanDuration, stringToNumber, stringToInteger} from '../src/util/util.js';

const TESTS_NUMBER = [
	{value: 0, expectedNumber: 0, expectedInteger: 0},
	{value: 1, expectedNumber: 1, expectedInteger: 1},
	{value: NaN, expectedNumber: null, expectedInteger: null},
	{value: Infinity, expectedNumber: null, expectedInteger: null},
	{value: '0', expectedNumber: 0, expectedInteger: 0},
	{value: '1', expectedNumber: 1, expectedInteger: 1},
	{value: '-1', expectedNumber: -1, expectedInteger: -1},
	{value: '100000', expectedNumber: 100000, expectedInteger: 100000},
	{value: '100000.00', expectedNumber: 100000, expectedInteger: 100000},
	{value: '100000.', expectedNumber: null, expectedInteger: null},
	{value: '7e7', expectedNumber: 7e7, expectedInteger: 7e7},
	{value: '-7e-7', expectedNumber: -7e-7, expectedInteger: null},
	{value: '0.1', expectedNumber: 0.1, expectedInteger: null},
	{value: '+.1', expectedNumber: 0.1, expectedInteger: null},
	{value: '-.1', expectedNumber: -0.1, expectedInteger: null},
	{value: '0.00001', expectedNumber: 0.00001, expectedInteger: null},
	{value: '-0.00001', expectedNumber: -0.00001, expectedInteger: null},
	{value: '', expectedNumber: null, expectedInteger: null},
	{value: ' 0', expectedNumber: null, expectedInteger: null},
	{value: '0 ', expectedNumber: null, expectedInteger: null},
	{value: ' 0 ', expectedNumber: null, expectedInteger: null},
	{value: '1 1', expectedNumber: null, expectedInteger: null},
];

describe('util', () => {
	it('humanDuration', () => {
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
	});

	it('stringToInteger', () => {
		TESTS_NUMBER.forEach((test) => {
			const computed = stringToInteger(test.value);
			assert.strictEqual(computed, test.expectedInteger);
		});
	});
});
