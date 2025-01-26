import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import expressStatusMonitor from 'express-status-monitor';
import oracledb from 'oracledb';
import webplsql from '../src/index.js';

const main = async () => {
	/*
	 *	The 'unhandledRejection' event is emitted whenever a Promise is rejected and no error handler is attached to the promise within a turn of the event loop.
	 */
	process.on('unhandledRejection', (reason, p) => {
		console.error('Unhandled promise rejection', reason, p);
		process.exit(1);
	});

	/*
	 *	Allocate the Oracle database pool
	 */

	const connectionPool = await oracledb.createPool({
		user: process.env.ORACLE_USER || '', // The database user name.
		password: process.env.ORACLE_PASSWORD || '', // The password of the database user.
		connectString: process.env.ORACLE_SERVER || '', // The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
		poolMin: 10, // The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
		poolMax: 1000, // The maximum number of connections to which a connection pool can grow.
		poolIncrement: 10, // The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
		queueTimeout: 1000, // The number of milliseconds after which connection requests waiting in the connection request queue are terminated. If queueTimeout is 0, then queued connection requests are never terminated.
	});

	/*
	 *	Start the server
	 */

	const PORT = 8080;
	const ROOT = '/lj_unittest';
	const STATIC_ROOT = '/q/p/lj_unittest/';
	const STATIC_PATH = process.env.PERISCOPE_DEPLOY_DIR || '';

	// create the upload middleware
	const upload = multer({
		storage: multer.diskStorage({
			destination: '/tmp/uploads',
			filename: (req, file, cb) => {
				const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
				cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
			},
		}),
		limits: {
			fileSize: 50 * 1024 * 1024, // 50MB limit
		},
	});

	// create express app
	const app = express();

	// add middleware
	app.use(upload.any());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// access log
	/*
	app.use(morgan('combined', {stream: fs.createWriteStream(path.join(process.cwd(), 'access.log'), {flags: 'a'})}));
	*/

	// add express status monitor
	/*
	app.use(expressStatusMonitor());
	console.log(`Express status monitor is listening on http://localhost:${PORT}/status`);
	*/

	// add the oracle pl/sql express middleware
	app.use(
		`${ROOT}/:name?`,
		webplsql(connectionPool, {
			trace: 'off',
			defaultPage: 'LAS_DLG_Startup.GO',
			doctable: 'ljp_documents',
			errorStyle: 'debug',
		}),
	);

	// serving static files
	console.log(`Serving static files on http://localhost:${PORT}${STATIC_ROOT} from ${STATIC_PATH}`);
	app.use(STATIC_ROOT, express.static(STATIC_PATH));

	// listen on port
	console.log(`Listening on http://localhost:${PORT}${ROOT}`);
	app.listen(PORT);
};

void main();
