import type {BindParameter, BindParameters, ExecuteOptions, Result} from 'oracledb';

/**
 * Type representing a Database LOB (Large Object).
 * We define a minimal interface to support both the real Lob (Stream) and our MockLob.
 * NOTE: We cannot use the full 'Lob' type here because our MockLob does not implement the full Duplex stream interface.
 * The 'destroy' method is the only one strictly required by our usage in 'invokeProcedure'.
 */
export type IDbLob = {
	destroy(): void;
};

/**
 * Type representing a Database Result.
 * We use the actual oracledb type.
 */
export type IDbResult<T = unknown> = Result<T>;

/**
 * Configuration for bind parameters.
 * We use the actual oracledb type.
 */
export type IDbBindParameter = BindParameter;

/**
 * Bind parameters configuration.
 * We use the actual oracledb type.
 */
export type IDbBindParameterConfig = BindParameters;

/**
 * Type representing a Database Connection.
 * subset of oracledb.Connection
 */
export type IDbConnection = {
	/**
	 * Execute a SQL statement.
	 *
	 * @param sql - The SQL statement.
	 * @param bindParams - Bind parameters.
	 * @param options - Execution options.
	 * @returns The result.
	 */
	execute<T = unknown>(sql: string, bindParams?: IDbBindParameterConfig, options?: ExecuteOptions): Promise<IDbResult<T>>;

	/**
	 * Create a temporary LOB.
	 * @param type - The LOB type (CLOB or BLOB constant).
	 * @returns The LOB.
	 */
	createLob(type: number): Promise<IDbLob>;

	commit(): Promise<void>;
	rollback(): Promise<void>;
	release(): Promise<void>;
};

/**
 * Type representing a Database Pool.
 * subset of oracledb.Pool
 */
export type IDbPool = {
	getConnection(): Promise<IDbConnection>;
	close(drainTime?: number): Promise<void>;
	connectionsOpen: number;
	connectionsInUse: number;
};

/**
 * Type for the Database Module (Constants + Factory).
 */
export type IDbModule = {
	// Constants
	BIND_IN: number;
	BIND_OUT: number;
	BIND_INOUT: number;

	STRING: number;
	NUMBER: number;
	DATE: number;
	CURSOR: number;
	BUFFER: number;
	CLOB: number;
	BLOB: number;

	DB_TYPE_VARCHAR: number;
	DB_TYPE_CLOB: number;
	DB_TYPE_NUMBER: number;
	DB_TYPE_DATE: number;

	// Helpers
	createPool(config: unknown): Promise<IDbPool>;
};
