// @flow

/*
*	Trace utilities
*/

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const util = require('util');
//const rimraf = require('rimraf');

const TRACE_ROOT_DIRECTORY = 'trace';

const SEPARATOR_LINE = '*'.repeat(132);

module.exports = class Trace {
	_enabled: boolean;
	_directory: string;
	_filename: string;
	_id: number;

	/**
	* Instantiate a new trace object.
	*
	* @param {'on' | 'off' | 'test'} trace - Tracing.
	*/
	constructor(trace: 'on' | 'off' | 'test') {
		this._enabled = trace !== 'off';
		this._directory = getTimestampDirectory();
		this._filename = '';
		this._id = 0;

		// istanbul ignore if
		if (!this._enabled) {
			return;
		}

		// create the trace directory
		try {
			mkdirp.sync(this._directory);
			if (trace === 'on') {
				// istanbul ignore next
				console.log(`Tracing to the directory "${this._directory}" is enabled.`);
			}
		} catch (e) {
			// istanbul ignore next
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
		// istanbul ignore if
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
		// istanbul ignore else
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
		// istanbul ignore else
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

		// istanbul ignore else
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
};

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
		// istanbul ignore next
		console.error(`Unable to write to trace file "${filename}"`, e, text);
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
	return path.join(TRACE_ROOT_DIRECTORY, getTimestamp().replace(/(-|:)/g, ''));
}

/*
*	trim any cr/lf at the end of the string
*/
function trimRight(text: string): string {
	let s = text;

	while (s[s.length] === '\n' || s[s.length] === '\r') {
		// istanbul ignore next
		s = s.slice(0, -1);
	}

	return s;
}
