import {Readable} from 'node:stream';
import oracledb from 'oracledb';
import z from 'zod';
import debugModule from 'debug';
import {ProcedureError} from './procedureError.ts';
import {errorToString} from '../../util/errorToString.ts';
import {OWA_STREAM_CHUNK_SIZE, OWA_STREAM_BUFFER_SIZE} from '../../../common/constants.ts';
import type {Connection, BindParameterConfig} from '../../types.ts';

const debug = debugModule('webplsql:owaPageStream');

export class OWAPageStream extends Readable {
	databaseConnection: Connection;
	chunkSize: number;
	isDone: boolean;

	/**
	 * @param databaseConnection - The database connection.
	 */
	constructor(databaseConnection: Connection) {
		super({highWaterMark: OWA_STREAM_BUFFER_SIZE}); // 16KB buffer
		this.databaseConnection = databaseConnection;
		this.chunkSize = OWA_STREAM_CHUNK_SIZE;
		this.isDone = false;
	}

	/**
	 * Fetch a chunk of the page from the database.
	 * @returns The array of lines fetched.
	 */
	async fetchChunk(): Promise<string[]> {
		if (this.isDone) return [];

		const bindParameter: BindParameterConfig = {
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
	 * @param _size - The size hint (unused).
	 */
	override _read(_size: number): void {
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
			.catch((err: unknown) => {
				this.destroy(err instanceof Error ? err : new Error(String(err)));
			});
	}

	/**
	 * Add initial body content to the stream.
	 * @param content - The initial content to prepend.
	 */
	addBody(content: string): void {
		if (content && content.length > 0) {
			this.push(content);
		}
	}
}
