import {describe, it, expect, vi} from 'vitest';
import {handlerLogger} from '../../../src/backend/handler/handlerLogger.ts';
import fs from 'node:fs';
import type {NextFunction} from 'express';

vi.mock('node:fs');
vi.mock('morgan', () => ({
	default: vi.fn(() => (_req: any, _res: any, next: NextFunction) => next()),
}));

describe('handler/handlerLogger', () => {
	it('should create a write stream and call morgan', () => {
		const filename = 'test.log';
		const mockStream = {};

		vi.mocked(fs.createWriteStream).mockReturnValue(mockStream as any);

		const handler = handlerLogger(filename);
		expect(handler).toBeDefined();
		expect(fs.createWriteStream).toHaveBeenCalledWith(expect.stringContaining(filename), {flags: 'a'});
	});
});
