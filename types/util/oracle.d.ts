export function connectionValid(connectionPool: Pool): Promise<boolean>;
export function poolCreate(user: string, password: string, connectString: string, poolMin?: number, poolMax?: number): Promise<Pool>;
export function poolClose(pool: Pool): Promise<void>;
export function poolsClose(pools: Pool[]): Promise<void>;
export type Pool = import("oracledb").Pool;
