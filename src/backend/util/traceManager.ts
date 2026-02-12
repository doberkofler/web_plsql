import fs from 'node:fs';
import path from 'node:path';
import type {procedureTraceEntry} from '../types.ts';

class TraceManager {
	enabled: boolean;
	filename: string;
	maxEntries: number;

	constructor() {
		this.enabled = false;
		this.filename = 'trace.json.log';
		this.maxEntries = 1000;
	}

	/**
	 * Toggle tracing
	 * @param enabled - New state
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	/**
	 * Is tracing enabled?
	 * @returns The state
	 */
	isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * Add a trace entry
	 * @param entry - The trace entry
	 */
	addTrace(entry: procedureTraceEntry): void {
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
	clear(): void {
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
	 * @returns The path
	 */
	getFilePath(): string {
		return path.resolve(this.filename);
	}
}

export const traceManager = new TraceManager();
