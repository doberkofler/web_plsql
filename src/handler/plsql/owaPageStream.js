import {Readable} from 'node:stream';
import oracledb from 'oracledb';
import z from 'zod';
import debugModule from 'debug';
import {ProcedureError} from './procedureError.js';
import {errorToString} from '../../util/errorToString.js';

const debug = debugModule('webplsql:owaPageStream');

/**
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('../../types.js').BindParameterConfig} BindParameterConfig
 */

export class OWAPageStream extends Readable {
	/**
	 * @param {Connection} databaseConnection - The database connection.
	 */
	constructor(databaseConnection) {
		super({highWaterMark: 16384}); // 16KB buffer
		this.databaseConnection = databaseConnection;
		this.chunkSize = 1000;
		this.isDone = false;
	}

	/**
	 * Fetch a chunk of the page from the database.
	 * @returns {Promise<string[]>} The array of lines fetched.
	 */
	async fetchChunk() {
		if (this.isDone) return [];

		/** @type {BindParameterConfig} */
		const bindParameter = {
			lines: {dir: oracledb.BIND_OUT, type: oracledb.STRING, maxArraySize: this.chunkSize},
			irows: {dir: oracledb.BIND_INOUT, type: oracledb.NUMBER, val: this.chunkSize},
		};

		const sqlStatement = 'BEGIN owa.get_page(thepage=>:lines, irows=>:irows); END;';

		try {
			const result = await this.databaseConnection.execute(sqlStatement, bindParameter);
			const {lines, irows} = z.object({irows: z.number(), lines: z.array(z.string())}).parse(result.outBinds);

			debug(`fetched ${lines.length} lines (irows=${irows})`);

			// If we got fewer lines than requested, OR if we got 0 lines, we are done
			if (lines.length < this.chunkSize) {
				this.isDone = true;
			}

			return lines;
		} catch (err) {
			if (err instanceof ProcedureError) {
				throw err;
			}
			throw new ProcedureError(`OWAPageStream: error when getting page\n${errorToString(err)}`, {}, sqlStatement, bindParameter);
		}
	}

	/**
	 * @override
	 * @param {number} _size - The size hint (unused).
	 * @returns {void}
	 */
	_read(_size) {
		this.fetchChunk()
			.then((lines) => {
				if (lines.length > 0) {
					this.push(lines.join(''));
				}

				// After fetching, check if we're done
				if (this.isDone) {
					this.push(null);
				}
			})
			.catch((/** @type {unknown} */ err) => {
				this.destroy(err instanceof Error ? err : new Error(String(err)));
			});
	}

	/**
	 * Add initial body content to the stream.
	 * @param {string} content - The initial content to prepend.
	 * @returns {void}
	 */
	addBody(content) {
		if (content && content.length > 0) {
			this.push(content);
		}
	}
}
