import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {traceManager} from '../src/util/traceManager.js';

describe('TraceManager', () => {
	const testFile = 'test-trace.json.log';

	beforeEach(() => {
		traceManager.filename = testFile;
		traceManager.setEnabled(false);
		if (fs.existsSync(testFile)) {
			try {
				fs.unlinkSync(testFile);
			} catch (e) {
				/* ignore */
			}
		}
	});

	afterEach(() => {
		if (fs.existsSync(testFile)) {
			try {
				fs.unlinkSync(testFile);
			} catch (e) {
				/* ignore */
			}
		}
		vi.restoreAllMocks();
	});

	it('should be disabled by default', () => {
		expect(traceManager.isEnabled()).toBe(false);
	});

	it('should toggle enabled state', () => {
		traceManager.setEnabled(true);
		expect(traceManager.isEnabled()).toBe(true);
		traceManager.setEnabled(false);
		expect(traceManager.isEnabled()).toBe(false);
	});

	it('should not add trace when disabled', () => {
		traceManager.addTrace({msg: 'test'});
		expect(fs.existsSync(testFile)).toBe(false);
	});

	it('should add trace when enabled', () => {
		traceManager.setEnabled(true);
		const entry = {msg: 'test message'};
		traceManager.addTrace(entry);

		expect(fs.existsSync(testFile)).toBe(true);
		const content = fs.readFileSync(testFile, 'utf8');
		expect(JSON.parse(content)).toEqual(entry);
	});

	it('should handle write errors gracefully', () => {
		traceManager.setEnabled(true);
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {
			/* mock */
		});
		vi.spyOn(fs, 'appendFileSync').mockImplementation(() => {
			throw new Error('disk full');
		});

		traceManager.addTrace({msg: 'test'});
		expect(spy).toHaveBeenCalledWith('TraceManager: error writing trace', expect.any(Error));
	});

	it('should clear traces', () => {
		traceManager.setEnabled(true);
		traceManager.addTrace({a: 1});
		expect(fs.statSync(testFile).size).toBeGreaterThan(0);

		traceManager.clear();
		expect(fs.statSync(testFile).size).toBe(0);
	});

	it('should handle clear errors gracefully', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {
			/* mock */
		});
		vi.spyOn(fs, 'existsSync').mockReturnValue(true);
		vi.spyOn(fs, 'truncateSync').mockImplementation(() => {
			throw new Error('permission denied');
		});

		traceManager.clear();
		expect(spy).toHaveBeenCalledWith('TraceManager: error clearing traces', expect.any(Error));
	});

	it('should return absolute file path', () => {
		const filePath = traceManager.getFilePath();
		expect(path.isAbsolute(filePath)).toBe(true);
		expect(filePath).toContain(testFile);
	});
});
