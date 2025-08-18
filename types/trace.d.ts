export function inspect(value: unknown, depth?: number | null): string;
export function logToFile(text: string): void;
export function inspectRequest(req: express.Request, simple?: boolean): string;
export function getBlock(title: string, body: string): string;
export function getTimestamp(): string;
import express from 'express';
