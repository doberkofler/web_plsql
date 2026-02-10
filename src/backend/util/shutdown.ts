import debugModule from 'debug';
const debug = debugModule('webplsql:shutdown');

/**
 * Install a shutdown handler.
 * @param handler - Shutdown handler
 */
export const installShutdown = (handler: () => Promise<void>): void => {
	debug('installShutdown');

	/*
	 *	The 'unhandledRejection' event is emitted whenever a Promise is rejected and no error handler is attached to the promise within a turn of the event loop.
	 */
	process.on('unhandledRejection', (reason) => {
		if (reason instanceof Error) {
			console.error(`\n${reason.message}. Graceful shutdown...`);
		} else {
			console.error('\nUnhandled promise rejection. Graceful shutdown...', reason);
		}
		void handler();
	});

	// install signal event handler
	process.on('SIGTERM', function sigterm() {
		console.log('\nGot SIGINT (aka ctrl-c in docker). Graceful shutdown...');
		void handler();
	});

	process.on('SIGINT', function sigint() {
		console.log('\nGot SIGTERM (aka docker container stop). Graceful shutdown...');
		void handler();
	});
};

/**
 * Force a shutdown.
 */
export const forceShutdown = (): void => {
	debug('forceShutdown');

	process.kill(process.pid, 'SIGTERM');
};
