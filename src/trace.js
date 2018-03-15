// @flow

/*
*	Trace utilities
*/

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const util = require('util');
const rimraf = require('rimraf');

const SEPARATOR_LINE = '*'.repeat(132);

class Trace {
	_enabled: boolean;
	_directory: string;
	_filename: string;
	_id: number;

	/**
	* Instantiate a new trace object.
	*
	* @param {boolean} enabled - Is tracing enabled.
	*/
	constructor(enabled: boolean) {
		this._enabled = enabled === true;
		this._directory = getTimestampDirectory();
		this._filename = '';
		this._id = 0;

		if (!this._enabled) {
			return;
		}

		// create the trace directory
		try {
			if (fs.existsSync(this._directory)) {
				rimraf.sync(path.join(this._directory, '*.log'));
			} else {
				mkdirp.sync(this._directory);
			}
			console.log(`Tracing to the directory "${this._directory}" is enabled.`);
		} catch (e) {
			console.error(`Unable to create new trace directory "${this._directory}"`, e);
		}
	}

	/**
	* Return if tracing is enabled or not.
	*
	* @returns {boolean} - Is tracing enabled.
	*/
	enabled(): boolean {
		return this._enabled === true;
	}

	/**
	* Start a new trace session for a new request.
	* This adds a trace line to the trace.log file and creating a new request trace file.
	*
	* @param {$Request} req - The req object represents the HTTP request.
	*/
	start(req: $Request) {
		if (!this._enabled) {
			return;
		}

		// Create the next unique request id
		req.uniqueRequestID = ++this._id;

		// append to the trace index
		appendSync(path.join(this._directory, 'trace.log'), `${req.uniqueRequestID.toString().padEnd(10)} - ${getTimestamp()} - ${req.originalUrl}\n`);

		// compute the trace filename
		this._filename = path.join(this._directory, req.uniqueRequestID.toString() + '.log');

		// write the initial request information
		this.append(SEPARATOR_LINE +
			getSection('TIMESTAMP', getTimestamp()) +
			getSection('REQUEST ID', req.uniqueRequestID) +
			getSection('REQUEST', Trace.inspectRequest(req)) +
			SEPARATOR_LINE +
			'\n');
	}

	/**
	* Write new message to the trace file.
	*
	* @param {string} text - Text to append.
	*/
	write(text: string): void {
		if (this._enabled) {
			this.append(`${getTimestamp()}:\n${trimRight(text)}\n${SEPARATOR_LINE}\n`);
		}
	}

	/**
	* Append text to the trace file.
	*
	* @param {string} text - Text to append.
	*/
	append(text: string): void {
		if (this._enabled) {
			appendSync(this._filename, text);
		}
	}

	/**
	* Return a string representation of the value.
	*
	* @param {*} value - Any value.
	* @returns {string} - The string representation.
	*/
	static inspect(value: any): string {
		return util.inspect(value, {showHidden: false, depth: null, colors: false});
	}

	/**
	* Return a string representation of the request.
	*
	* @param {$Request} req - Request.
	* @param {boolean} simple - Set to false to see all public properties of the request.
	* @returns {string} - The string representation.
	*/
	static inspectRequest(req: $Request, simple: boolean = true): string {
		const simpleRequest = {};

		if (simple) {
			['originalUrl', 'params', 'query', 'url', 'method', 'body', 'files', 'secret', 'cookies'].forEach(key => {
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
}

/**
* Append text to the trace file.
*
* @param {string} filename - Trace file name.
* @param {string} text - Text to append.
*/
function appendSync(filename: string, text: string): void {
	try {
		fs.appendFileSync(filename, text);
	} catch (e) {
		console.error(`Unable to write to trace file "${filename}"`, e);
		console.error(text);
	}
}

/*
*	get a section of a trace message
*/
function getSection(section: string, text: string): string {
	return `\n${section}\n${'='.repeat(section.length)}\n${text}\n`;
}

/*
*	get a timestamp
*/
function getTimestamp(): string {
	return new Date().toISOString();
}

/*
*	get a new directory name based on the current timestamp
*/
function getTimestampDirectory(): string {
	return path.join('trace', getTimestamp().replace(/(-|:)/g, ''));
}

/*
*	trim any cr/lf at the end of the string
*/
function trimRight(text: string): string {
	let s = text;

	while (s[s.length] === '\n' || s[s.length] === '\r') {
		s = s.slice(0, -1);
	}

	return s;
}

module.exports = {
	Trace: Trace
};
