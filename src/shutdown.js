import debugModule from 'debug';
const debug = debugModule('webplsql:shutdown');

/**
 * @param {() => Promise<void>} handler - Shutdown handler
 * @returns {void}
 */
const shutdown = (handler) => {
	handler().then(
		() => process.exit(0),
		() => process.exit(1),
	);

	process.exit(0);
};

/**
 * Install a shutdown handler.
 * @param {() => Promise<void>} handler - Shutdown handler
 * @returns {void}
 */
export const installShutdown = (handler) => {
	debug('installShutdown');

	/*
	 *	The 'unhandledRejection' event is emitted whenever a Promise is rejected and no error handler is attached to the promise within a turn of the event loop.
	 */
	process.on('unhandledRejection', (reason, p) => {
		console.log('\nUnhandled promise rejection. Graceful shutdown...', reason, p);
		shutdown(handler);
	});

	// install signal event handler
	process.on('SIGTERM', function sigterm() {
		console.log('\nGot SIGINT (aka ctrl-c in docker). Graceful shutdown...');
		shutdown(handler);
	});

	process.on('SIGINT', function sigint() {
		console.log('\nGot SIGTERM (aka docker container stop). Graceful shutdown...');
		shutdown(handler);
	});
};

/**
 * Force a shutdown.
 * @returns {void}
 */
export const forceShutdown = () => {
	debug('forceShutdown');

	process.kill(process.pid, 'SIGTERM');
};
