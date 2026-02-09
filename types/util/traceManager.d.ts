export const traceManager: TraceManager;
export type TraceEntry = import("../admin/js/types.js").TraceEntry;
/**
 * @typedef {import('../admin/js/types.js').TraceEntry} TraceEntry
 */
declare class TraceManager {
    enabled: boolean;
    filename: string;
    maxEntries: number;
    /**
     * Toggle tracing
     * @param {boolean} enabled - New state
     */
    setEnabled(enabled: boolean): void;
    /**
     * Is tracing enabled?
     * @returns {boolean} - The state
     */
    isEnabled(): boolean;
    /**
     * Add a trace entry
     * @param {object} entry - The trace entry
     */
    addTrace(entry: object): void;
    /**
     * Clear all traces
     */
    clear(): void;
    /**
     * Get the full path to the trace file
     * @returns {string} - The path
     */
    getFilePath(): string;
}
export {};
