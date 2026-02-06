import * as rotatingFileStream from 'rotating-file-stream';

/**
 * @typedef {object} LogEntry
 * @property {string} timestamp - ISO string
 * @property {'error'|'info'|'warning'} type - Log level
 * @property {string} message - Error message
 * @property {object} [req] - Request details
 * @property {object} [details] - Additional details (stack, sql, etc)
 */

export class JsonLogger {
	constructor(filename = 'error.json.log') {
		this.stream = rotatingFileStream.createStream(filename, {
			size: '10M', // rotate every 10 MegaBytes written
			interval: '1d', // rotate daily
			maxFiles: 10, // maximum number of rotated files to keep
			compress: 'gzip', // compress rotated files
		});
	}

	/**
	 * Log an entry as NDJSON.
	 * @param {LogEntry} entry - The entry to log.
	 */
	log(entry) {
		try {
			// Ensure timestamp exists
			if (!entry.timestamp) {
				entry.timestamp = new Date().toISOString();
			}
			const line = JSON.stringify(entry);
			this.stream.write(line + '\n');
		} catch (err) {
			console.error('JsonLogger: Failed to write log', err);
		}
	}

	/**
	 * Close the stream.
	 */
	close() {
		this.stream.end();
	}
}

export const jsonLogger = new JsonLogger();
