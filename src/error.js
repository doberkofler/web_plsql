// @flow

const util = require('util');

function error(err: mixed) {
	let text = '';

	if (err instanceof Error) {
		text = err.toString() + '\n' + err.stack;
	} else if (typeof err === 'string') {
		error(new Error(err));
	} else {
		error(new Error(util.inspect(err)));
	}

	console.error(text);

	process.exit(1);
}

module.exports = error;
