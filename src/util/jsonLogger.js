import * as rotatingFileStream from 'rotating-file-stream';
import {JSON_LOG_ROTATION_SIZE, JSON_LOG_ROTATION_INTERVAL, JSON_LOG_MAX_ROTATED_FILES} from '../constants.js';

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
			size: JSON_LOG_ROTATION_SIZE, // rotate every 10 MegaBytes written
			interval: JSON_LOG_ROTATION_INTERVAL, // rotate daily
			maxFiles: JSON_LOG_MAX_ROTATED_FILES, // maximum number of rotated files to keep
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
