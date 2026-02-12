import * as rotatingFileStream from 'rotating-file-stream';
import {JSON_LOG_ROTATION_SIZE, JSON_LOG_ROTATION_INTERVAL, JSON_LOG_MAX_ROTATED_FILES} from '../../common/constants.ts';
import {type logEntryType} from '../types.ts';
import {type MakeOptional} from '../../common/typeUtilities.ts';

export class JsonLogger {
	stream: rotatingFileStream.RotatingFileStream;

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
	 * @param entry - The entry to log.
	 */
	log(entry: MakeOptional<logEntryType, 'timestamp'>): void {
		try {
			// Ensure timestamp exists
			entry.timestamp ??= new Date().toISOString();
			const line = JSON.stringify(entry);
			this.stream.write(line + '\n');
		} catch (err) {
			console.error('JsonLogger: Failed to write log', err);
		}
	}

	/**
	 * Close the stream.
	 */
	close(): void {
		this.stream.end();
	}
}

export const jsonLogger = new JsonLogger();
