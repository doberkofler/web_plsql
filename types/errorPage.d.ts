export function errorPage(req: Request, res: Response, options: configPlSqlType, error: unknown): void;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type BindParameterConfig = import("./types.js").BindParameterConfig;
export type environmentType = import("./types.js").environmentType;
export type configPlSqlType = import("./types.js").configPlSqlType;
export type outputType = {
    html: string;
    text: string;
};
