import fs from 'fs';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
//@ts-expect-error
import multipart from 'connect-multiparty';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import oracledb from 'oracledb';
import webplsql from '../src/index.js';

const main = async () => {
	/*
	 *	Allocate the Oracle database pool
	 */

	const connectionPool = await oracledb.createPool({
		user: 'APEX_PUBLIC_USER',
		password: 'manager',
		connectString: 'localhost:1521/TEST',
	});

	/*
	 *	Start the server
	 */

	const PORT = 8000;
	const PATH = '/apex';

	// create express app
	const app = express();

	// add middleware
	app.use(multipart());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());
	app.use(morgan('combined', {stream: fs.createWriteStream(path.join(process.cwd(), 'access.log'), {flags: 'a'})}));

	// add the oracle pl/sql express middleware
	app.use(
		`${PATH}/:name?`,
		webplsql(connectionPool, {
			trace: 'off',
			defaultPage: 'apex',
			doctable: 'wwv_flow_file_objects$',
			pathAlias: {
				alias: 'r',
				procedure: 'wwv_flow.resolve_friendly_url',
			},
			errorStyle: 'debug',
		}),
	);

	// serving static files
	const staticFilesPath = path.resolve('/Middleware/apex/images/');
	app.use('/i/', express.static(staticFilesPath));

	// listen on port
	console.log(`Listening on http://localhost:${PORT}${PATH}`);
	app.listen(PORT);
};

void main();
