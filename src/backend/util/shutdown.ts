import debugModule from 'debug';
const debug = debugModule('webplsql:shutdown');

/**
 * Install a shutdown handler.
 * @param handler - Shutdown handler
 */
export const installShutdown = (handler: () => Promise<void>): void => {
	debug('installShutdown');

	let isShuttingDown = false;

	/*
	 *	The 'unhandledRejection' event is emitted whenever a Promise is rejected and no error handler is attached to the promise within a turn of the event loop.
	 */
	process.on('unhandledRejection', (reason) => {
		if (isShuttingDown) {
			return;
		}
		isShuttingDown = true;

		if (reason instanceof Error) {
			console.error(`\n${reason.message}. Graceful shutdown...`);
		} else {
			console.error('\nUnhandled promise rejection. Graceful shutdown...', reason);
		}
		void handler().catch((err: unknown) => {
			console.error('Error during shutdown:', err);
			process.exit(1);
		});
	});

	// install signal event handler
	process.on('SIGTERM', function sigterm() {
		if (isShuttingDown) {
			return;
		}
		isShuttingDown = true;

		console.log('\nGot SIGTERM (aka docker container stop). Graceful shutdown...');
		void handler().catch((err: unknown) => {
			console.error('Error during shutdown:', err);
			process.exit(1);
		});
	});

	process.on('SIGINT', function sigint() {
		if (isShuttingDown) {
			return;
		}
		isShuttingDown = true;

		console.log('\nGot SIGINT (aka ctrl-c in docker). Graceful shutdown...');
		void handler().catch((err: unknown) => {
			console.error('Error during shutdown:', err);
			process.exit(1);
		});
	});
};

/**
 * Force a shutdown.
 */
export const forceShutdown = (): void => {
	debug('forceShutdown');

	process.kill(process.pid, 'SIGTERM');
};
