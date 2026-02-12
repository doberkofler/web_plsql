import z from 'zod';
import {configStaticSchema} from '../common/configStaticSchema.ts';
import type {Connection} from 'oracledb';
import type {CookieOptions} from 'express';
import type {Readable} from 'node:stream';
import type {Cache} from './util/cache.ts';

export {procedureTraceEntrySchema, type procedureTraceEntry} from '../common/procedureTraceEntry.ts';
export {logEntrySchema, type logEntryType} from '../common/logEntrySchema.ts';

/**
 * Defines the style of error reporting
 * 'basic': standard error messages
 * 'debug': detailed error messages including database context
 */
const z$errorStyleType = z.enum(['basic', 'debug']);

/**
 * Custom callback signature for manual transaction handling
 */
type transactionCallbackType = (connection: Connection, procedure: string) => void | Promise<void>;

/**
 * Defines how transactions are handled after procedure execution
 * 'commit': automatically commit
 * 'rollback': automatically rollback
 * callback: custom function for manual handling
 */
const transactionModeSchema = z.union([
	z.custom<transactionCallbackType>((val) => typeof val === 'function', {
		message: 'Invalid transaction callback',
	}),
	z.literal('commit'),
	z.literal('rollback'),
	z.undefined(),
	z.null(),
]);
export type transactionModeType = z.infer<typeof transactionModeSchema>;

/**
 * Authentication callback signature.
 * Returns the identity string on success, or null on failure.
 * @public
 */
export type AuthCallback = (credentials: {username: string; password?: string | undefined}) => Promise<string | null>;

/**
 * Authentication configuration for a PL/SQL route
 */
const z$authSchema = z.strictObject({
	/** Authentication type */
	type: z.literal('basic'),
	/** Callback function to validate credentials */
	callback: z.custom<AuthCallback>((val) => typeof val === 'function', {
		message: 'Invalid auth callback',
	}),
	/** Authentication realm */
	realm: z.string().optional(),
});

/**
 * PL/SQL handler behavior configuration
 */
export const z$configPlSqlHandlerType = z.strictObject({
	/** Default procedure to execute if none specified */
	defaultPage: z.string(),
	/** Virtual path alias for procedures */
	pathAlias: z.string().optional(),
	/** Procedure name associated with the path alias */
	pathAliasProcedure: z.string().optional(),
	/** Database table used for file uploads/downloads */
	documentTable: z.string(),
	/** List of pattern/procedure names excluded from execution */
	exclusionList: z.array(z.string()).optional(),
	/** PL/SQL function called to validate requests */
	requestValidationFunction: z.string().optional(),
	/** Post-execution transaction behavior */
	transactionMode: transactionModeSchema.optional(),
	/** Error reporting style */
	errorStyle: z$errorStyleType,
	/** Static CGI environment variables to be passed to the session */
	cgi: z.record(z.string(), z.string()).optional(),
	/** Authentication settings */
	auth: z$authSchema.optional(),
});
export type configPlSqlHandlerType = z.infer<typeof z$configPlSqlHandlerType>;

/**
 * Database connection configuration for a PL/SQL route
 */
const z$configPlSqlConfigType = z.strictObject({
	/** URL route prefix for this database connection */
	route: z.string(),
	/** Database username */
	user: z.string(),
	/** Database password */
	password: z.string(),
	/** Oracle connection string (TNS or EZConnect) */
	connectString: z.string(),
});
export type configPlSqlConfigType = z.infer<typeof z$configPlSqlConfigType>;

/**
 * Complete PL/SQL route configuration combining handler and connection settings
 */
export type configPlSqlType = configPlSqlHandlerType & configPlSqlConfigType;
const z$configPlSqlType = z.strictObject({
	...z$configPlSqlHandlerType.shape,
	...z$configPlSqlConfigType.shape,
});

/**
 * Root application configuration
 */
export const z$configType = z.strictObject({
	/** Server listening port */
	port: z.number(),
	/** Array of static file routes */
	routeStatic: z.array(configStaticSchema),
	/** Array of PL/SQL routes */
	routePlSql: z.array(z$configPlSqlType),
	/** Maximum allowed size for file uploads (bytes) */
	uploadFileSizeLimit: z.number().optional(),
	/** Path to the log file */
	loggerFilename: z.string(),
	/** URL route prefix for the admin console */
	adminRoute: z.string().optional(),
	/** Username for admin console authentication */
	adminUser: z.string().optional(),
	/** Password for admin console authentication */
	adminPassword: z.string().optional(),
	/** Developer mode (skips frontend build check, enables CORS) */
	devMode: z.boolean().optional(),
});
export type configType = z.infer<typeof z$configType>;

/**
 * Environment variables as string key-value pairs
 */
export type environmentType = Record<string, string>;

/**
 * HTTP arguments mapping with support for multi-value parameters
 */
export type argObjType = Record<string, string | string[]>;

/**
 * Mapping of PL/SQL procedure argument names to their database types
 */
export type argsType = Record<string, string>;

/**
 * Metadata for uploaded files
 */
export type fileUploadType = {
	/** HTML form field name */
	fieldname: string;
	/** Original filename as uploaded by the client */
	originalname: string;
	/** Content encoding */
	encoding: string;
	/** MIME type */
	mimetype: string;
	/** Local temporary filename */
	filename: string;
	/** Absolute path to the temporary file */
	path: string;
	/** File size in bytes */
	size: number;
};

/**
 * HTTP cookie definition
 */
export type cookieType = {
	/** Cookie name */
	name: string;
	/** Cookie value */
	value: string;
	/** Express cookie options (domain, path, expires, etc.) */
	options: CookieOptions;
};

/**
 * Internal representation of a generated web page or file response
 */
export type pageType = {
	/** Response body content as string or stream */
	body: string | Readable;
	/** HTTP response headers and status */
	head: {
		/** Array of cookies to be set */
		cookies: cookieType[];
		/** Content-Type header value */
		contentType?: string;
		/** Content-Length header value */
		contentLength?: number;
		/** HTTP status code */
		statusCode?: number;
		/** HTTP status reason phrase */
		statusDescription?: string;
		/** Location header for redirects */
		redirectLocation?: string;
		/** Additional custom HTTP headers */
		otherHeaders: Record<string, string>;
		/** Server header value */
		server?: string;
	};
	/** Metadata for file downloads if applicable */
	file: {
		/** MIME type of the file */
		fileType: string | null;
		/** Size of the file in bytes */
		fileSize: number | null;
		/** File content as stream or buffer */
		fileBlob: Readable | Buffer | null;
	};
};

export type ProcedureNameCache = Cache<string>;
export type ArgumentCache = Cache<argsType>;
