import fs from 'node:fs';
import path from 'node:path';

/**
 * @typedef {import('../admin/js/types.js').TraceEntry} TraceEntry
 */

class TraceManager {
	constructor() {
		this.enabled = false;
		this.filename = 'trace.json.log';
		this.maxEntries = 1000;
	}

	/**
	 * Toggle tracing
	 * @param {boolean} enabled - New state
	 */
	setEnabled(enabled) {
		this.enabled = enabled;
	}

	/**
	 * Is tracing enabled?
	 * @returns {boolean} - The state
	 */
	isEnabled() {
		return this.enabled;
	}

	/**
	 * Add a trace entry
	 * @param {object} entry - The trace entry
	 */
	addTrace(entry) {
		if (!this.enabled) return;

		try {
			const line = JSON.stringify(entry) + '\n';
			fs.appendFileSync(this.filename, line);
		} catch (err) {
			console.error('TraceManager: error writing trace', err);
		}
	}

	/**
	 * Clear all traces
	 */
	clear() {
		try {
			if (fs.existsSync(this.filename)) {
				fs.truncateSync(this.filename, 0);
			}
		} catch (err) {
			console.error('TraceManager: error clearing traces', err);
		}
	}

	/**
	 * Get the full path to the trace file
	 * @returns {string} - The path
	 */
	getFilePath() {
		return path.resolve(this.filename);
	}
}

export const traceManager = new TraceManager();
