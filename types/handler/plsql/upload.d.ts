export function getFiles(req: Request): fileUploadType[];
export function uploadFile(file: fileUploadType, doctable: string, databaseConnection: Connection): Promise<void>;
export type Request = import("express").Request;
export type Connection = import("oracledb").Connection;
export type fileUploadType = import("../../types.js").fileUploadType;
