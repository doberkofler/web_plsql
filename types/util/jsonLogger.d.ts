import * as rotatingFileStream from 'rotating-file-stream';
export type LogEntry = {
    timestamp?: string;
    type: 'error' | 'info' | 'warning';
    message: string;
    req?: object;
    details?: object;
};
export declare class JsonLogger {
    stream: rotatingFileStream.RotatingFileStream;
    constructor(filename?: string);
    /**
     * Log an entry as NDJSON.
     * @param entry - The entry to log.
     */
    log(entry: LogEntry): void;
    /**
     * Close the stream.
     */
    close(): void;
}
export declare const jsonLogger: JsonLogger;
