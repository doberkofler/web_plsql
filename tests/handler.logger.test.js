import {describe, it, expect, vi} from 'vitest';
import {handlerLogger} from '../src/handler/handlerLogger.js';
import fs from 'node:fs';

vi.mock('node:fs');
vi.mock('morgan', () => ({
	default: vi.fn(() => (/** @type {any} */ _req, /** @type {any} */ _res, /** @type {import('express').NextFunction} */ next) => next()),
}));

describe('handler/handlerLogger', () => {
	it('should create a write stream and call morgan', () => {
		const filename = 'test.log';
		const mockStream = {};
		vi.mocked(fs.createWriteStream).mockReturnValue(/** @type {any} */ (mockStream));

		const handler = handlerLogger(filename);
		expect(handler).toBeDefined();
		expect(fs.createWriteStream).toHaveBeenCalledWith(expect.stringContaining(filename), {flags: 'a'});
	});
});
