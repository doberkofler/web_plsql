export function processRequest(req: Request, res: Response, options: configPlSqlHandlerType, connectionPool: Pool, procedureNameCache: ProcedureNameCache, argumentCache: ArgumentCache): Promise<void>;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type Pool = import("oracledb").Pool;
export type Connection = import("oracledb").Connection;
export type argObjType = import("../../types.js").argObjType;
export type configPlSqlHandlerType = import("../../types.js").configPlSqlHandlerType;
export type ProcedureNameCache = import("../../util/cache.js").Cache<string>;
export type ArgumentCache = import("../../util/cache.js").Cache<import("./procedureNamed.js").argsType>;
