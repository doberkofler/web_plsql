/**
 * Install a shutdown handler.
 * @param handler - Shutdown handler
 */
export declare const installShutdown: (handler: () => Promise<void>) => void;
/**
 * Force a shutdown.
 */
export declare const forceShutdown: () => void;
