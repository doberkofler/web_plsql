export function processRequest(req: Request, res: Response, options: middlewareOptions, connectionPool: Pool): Promise<void>;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type Pool = import("oracledb").Pool;
export type Connection = import("oracledb").Connection;
export type argObjType = import("./types.js").argObjType;
export type middlewareOptions = import("./types.js").middlewareOptions;
