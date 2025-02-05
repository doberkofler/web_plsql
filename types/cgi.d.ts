export function getCGI(req: Request, doctable: string, cgi: environmentType): environmentType;
export type Request = import("express").Request;
export type environmentType = import("./types.js").environmentType;
export type middlewareOptions = import("./types.js").middlewareOptions;
