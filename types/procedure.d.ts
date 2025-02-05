export function invokeProcedure(req: Request, res: Response, argObj: argObjType, cgiObj: environmentType, filesToUpload: fileUploadType[], options: middlewareOptions, databaseConnection: Connection): Promise<void>;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type Connection = import("oracledb").Connection;
export type Result = import("oracledb").Result<unknown>;
export type argObjType = import("./types.js").argObjType;
export type fileUploadType = import("./types.js").fileUploadType;
export type environmentType = import("./types.js").environmentType;
export type middlewareOptions = import("./types.js").middlewareOptions;
export type BindParameterConfig = import("./types.js").BindParameterConfig;
