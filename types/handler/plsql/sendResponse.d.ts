export function sendResponse(req: Request, res: Response, page: pageType): void;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type CookieOptions = import("express").CookieOptions;
export type pageType = import("../../types.js").pageType;
export type cookieType = import("../../types.js").cookieType;
