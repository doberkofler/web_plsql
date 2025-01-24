import fs from 'fs';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
//@ts-expect-error
import multipart from 'connect-multiparty';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import expressStatusMonitor from 'express-status-monitor';
import oracledb from 'oracledb';
import webplsql from '../src/index.js';

const main = async () => {
	/*
	 *	Allocate the Oracle database pool
	 */

	const connectionPool = await oracledb.createPool({
		user: process.env.NODE_ORACLEDB_USER || 'scott', // The database user name.
		password: process.env.NODE_ORACLEDB_PASSWORD || 'tiger', // The password of the database user.
		connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING || 'localhost:1521/test', // The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
		poolMin: 10, // The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
		poolMax: 1000, // The maximum number of connections to which a connection pool can grow.
		poolIncrement: 10, // The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
		queueTimeout: 1000, // The number of milliseconds after which connection requests waiting in the connection request queue are terminated. If queueTimeout is 0, then queued connection requests are never terminated.
	});

	/*
	 *	Start the server
	 */

	const PORT = 8000;
	const PATH = '/base';

	// Welcome message
	console.log(`Welcome to web_plsql!`);

	// create express app
	const app = express();

	// add middleware
	app.use(multipart());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());
	app.use(morgan('combined', {stream: fs.createWriteStream(path.join(process.cwd(), 'access.log'), {flags: 'a'})}));

	// add express status monitor
	app.use(expressStatusMonitor());
	console.log(`Express status monitor is listening on http://localhost:${PORT}/status`);

	// add the oracle pl/sql express middleware
	app.use(
		`${PATH}/:name?`,
		webplsql(connectionPool, {
			trace: 'off',
			defaultPage: 'sample.pageIndex',
			doctable: 'docTable',
			pathAlias: {
				alias: 'myalias',
				procedure: 'sample.pagePathAlias',
			},
			errorStyle: 'debug',
		}),
	);

	// serving static files
	app.use('/static', express.static(path.join(process.cwd(), 'examples/static')));

	// shutdown
	process.on('SIGTERM', shutDown);
	process.on('SIGINT', shutDown);

	// listen on port
	console.log(`Sample app is listening on http://localhost:${PORT}${PATH}`);
	const server = app.listen(PORT);

	async function shutDown() {
		console.log('Received kill signal, shutting down gracefully');

		await connectionPool.close(0);

		server.close(() => {
			console.log('Closed out remaining connections');
			process.exit(0);
		});

		setTimeout(() => {
			console.error('Could not close connections in time, forcefully shutting down');
			process.exit(1);
		}, 10000);
	}
};

void main();
