// @flow

/*
*	Trace utilities
*/

const fs = require('fs');
const util = require('util');

const TRACE_FILENAME = 'trace.log';

function reqToString(req: $Request, simple: boolean = true): string {
	const simpleRequest = {};

	if (simple) {
		['uniqueRequestID', 'originalUrl', 'params', 'query', 'url', 'method', 'body', 'files', 'secret', 'cookies'].forEach(key => {
			if (req[key]) {
				simpleRequest[key] = req[key];
			}
		});
	} else {
		Object.keys(req).filter(key => typeof key === 'string' && key.length > 1 && key[0] !== '_').forEach(key => {
			simpleRequest[key] = req[key];
		});
	}

	return util.inspect(simpleRequest, {showHidden: false, depth: null, colors: false});
}

function trace(msg: string): void {
	const separator = '\n\n' + '*'.repeat(100) + '\n\n';
	fs.appendFileSync(TRACE_FILENAME, msg + separator);
}

function traceRequest(req: $Request): void {
	trace(util.inspect(req, {showHidden: false, depth: 3, colors: false}));
}

module.exports = {
	reqToString: reqToString,
	trace: trace,
	traceRequest: traceRequest
};
