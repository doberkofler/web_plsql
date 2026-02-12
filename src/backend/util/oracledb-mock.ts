import type {Connection, Pool, Lob, Result, BindParameters, ExecuteOptions, DbType} from 'oracledb';

// Mock implementation
export type ExecuteCallback = (sql: string, binds?: BindParameters) => Promise<Result<unknown>> | Result<unknown>;
let executeCallback: ExecuteCallback | null = null;

/**
 * Test utility: Set the callback for execute calls.
 * @param cb - The callback
 */
export const setExecuteCallback = (cb: ExecuteCallback | null) => {
	executeCallback = cb;
};

/**
 * Mock LOB class.
 */
class MockLob {
	type: DbType | number;
	constructor(type: DbType | number) {
		this.type = type;
	}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	destroy(): void {}
}

/**
 * Mock Connection class.
 */
class MockConnection {
	async execute<T = unknown>(sql: string, bindParams?: BindParameters, _options?: ExecuteOptions): Promise<Result<T>> {
		if (executeCallback) {
			return (await executeCallback(sql, bindParams)) as Result<T>;
		}
		return {rows: []} as Result<T>;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async createLob(type: DbType | number): Promise<Lob> {
		return new MockLob(type) as unknown as Lob;
	}

	async commit(): Promise<void> {
		// empty
	}
	async rollback(): Promise<void> {
		// empty
	}
	async release(): Promise<void> {
		// empty
	}
}

/**
 * Mock Pool class.
 */
class MockPool {
	connectionsOpen = 0;
	connectionsInUse = 0;

	// eslint-disable-next-line @typescript-eslint/require-await
	async getConnection(): Promise<Connection> {
		this.connectionsInUse++;
		this.connectionsOpen = Math.max(this.connectionsOpen, this.connectionsInUse);
		return new MockConnection() as unknown as Connection;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async close(_drainTime?: number): Promise<void> {
		this.connectionsOpen = 0;
		this.connectionsInUse = 0;
	}
}

/**
 * Mock createPool function.
 * @param _config - The configuration
 * @returns The pool
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function createPool(_config: unknown): Promise<Pool> {
	return new MockPool() as unknown as Pool;
}

// Default export mimics oracledb module structure for test mocking
export default {
	// Constants will be merged from actual oracledb by vi.importActual in test_setup.ts
	createPool,
	setExecuteCallback,
};
