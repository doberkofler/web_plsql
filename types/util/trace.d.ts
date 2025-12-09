export function inspect(value: unknown, depth?: number | null): string;
export function toTable(head: string[], body: string[][]): outputType;
export function logToFile(text: string): void;
export function getBlock(title: string, body: string): string;
export function getFormattedMessage(para: messageType): outputType;
export function warningMessage(para: messageType): void;
export type Request = import("express").Request;
export type BindParameterConfig = import("../types.js").BindParameterConfig;
export type environmentType = import("../types.js").environmentType;
export type outputType = {
    html: string;
    text: string;
};
export type messageType = {
    type: "error" | "warning" | "trace";
    message: string;
    timestamp?: Date | null;
    req?: Request | null;
    environment?: environmentType | null;
    sql?: string | null;
    bind?: BindParameterConfig | null;
};
