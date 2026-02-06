/**
 * @typedef {object} LogEntry
 * @property {string} timestamp - ISO string
 * @property {'error'|'info'|'warning'} type - Log level
 * @property {string} message - Error message
 * @property {object} [req] - Request details
 * @property {object} [details] - Additional details (stack, sql, etc)
 */
export class JsonLogger {
    constructor(filename?: string);
    stream: rotatingFileStream.RotatingFileStream;
    /**
     * Log an entry as NDJSON.
     * @param {LogEntry} entry - The entry to log.
     */
    log(entry: LogEntry): void;
    /**
     * Close the stream.
     */
    close(): void;
}
export const jsonLogger: JsonLogger;
export type LogEntry = {
    /**
     * - ISO string
     */
    timestamp: string;
    /**
     * - Log level
     */
    type: "error" | "info" | "warning";
    /**
     * - Error message
     */
    message: string;
    /**
     * - Request details
     */
    req?: object;
    /**
     * - Additional details (stack, sql, etc)
     */
    details?: object;
};
import * as rotatingFileStream from 'rotating-file-stream';
