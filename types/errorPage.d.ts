export function errorPage(req: Request, res: Response, options: middlewareOptions, error: unknown): void;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type BindParameterConfig = import("./types.js").BindParameterConfig;
export type environmentType = import("./types.js").environmentType;
export type middlewareOptions = import("./types.js").middlewareOptions;
export type outputType = {
    html: string;
    text: string;
};
