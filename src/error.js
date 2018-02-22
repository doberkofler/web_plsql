// @flow

/*
*	Error handling
*/

const util = require('util');

function error(msg: string, err: mixed) {
	if (err instanceof Error) {
		msg += msg.length > 0 ? '\n' : '';
		msg += err.toString() + '\n' + err.stack;
	} else if (typeof err === 'string') {
		error(msg, new Error(err));
	} else {
		error(msg, new Error(util.inspect(err)));
	}

	console.error(msg);

	process.exit(1);
}

module.exports = error;
