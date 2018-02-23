// @flow

/*
*	Trace utilities
*/

const util = require('util');
const _ = require('lodash');

function traceReq(req: $Request): string {
	return util.inspect(_.pick(req, ['httpVersion', 'complete', 'originalUrl', 'params', 'query', 'headers', 'url', 'method', 'body', 'files', 'secret', 'cookies', 'signedCookies']), {showHidden: false, depth: 3, colors: true});
}

module.exports = {
	traceReq: traceReq
};
