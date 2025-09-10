import debugModule from 'debug';
const debug = debugModule('webplsql:shutdown');

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
 * @returns {void}
 */
export const forceShutdown = () => {
	debug('forceShutdown');

	process.kill(process.pid, 'SIGTERM');
};
