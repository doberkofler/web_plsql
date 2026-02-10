import type { TraceEntry } from '../admin/js/types.ts';
declare class TraceManager {
    enabled: boolean;
    filename: string;
    maxEntries: number;
    constructor();
    /**
     * Toggle tracing
     * @param enabled - New state
     */
    setEnabled(enabled: boolean): void;
    /**
     * Is tracing enabled?
     * @returns The state
     */
    isEnabled(): boolean;
    /**
     * Add a trace entry
     * @param entry - The trace entry
     */
    addTrace(entry: TraceEntry): void;
    /**
     * Clear all traces
     */
    clear(): void;
    /**
     * Get the full path to the trace file
     * @returns The path
     */
    getFilePath(): string;
}
export declare const traceManager: TraceManager;
export {};
