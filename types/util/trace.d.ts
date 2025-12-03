export function inspect(value: unknown, depth?: number | null): string;
export function toTable(head: string[], body: string[][]): outputType;
export function logToFile(text: string): void;
export function inspectRequest(req: express.Request, simple?: boolean): string;
export function inspectBindParameter(output: outputType, bind: BindParameterConfig): undefined;
export function inspectEnvironment(output: outputType, environment: environmentType): void;
export function getBlock(title: string, body: string): string;
export function getTimestamp(): string;
export type BindParameterConfig = import("../types.js").BindParameterConfig;
export type environmentType = import("../types.js").environmentType;
export type outputType = {
    html: string;
    text: string;
};
import express from 'express';
