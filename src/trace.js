// @flow

/*
*	Trace utilities
*/

const fs = require('fs');
const util = require('util');
const _ = require('lodash');

const TRACE_FILENAME = 'trace.log';

function reqToString(req: $Request): string {
	const includedKeys = [/*'httpVersion', 'complete',*/'originalUrl', 'params', 'query', /*'headers', */'url', 'method', 'body', 'files', 'secret', 'cookies'/*, 'signedCookies'*/];
	return util.inspect(_.pick(req, includedKeys), {showHidden: false, depth: null, colors: false});
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
