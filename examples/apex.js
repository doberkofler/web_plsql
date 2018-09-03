const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const multipart = require('connect-multiparty');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');

const oracledb = require('oracledb');
const webplsql = require('../lib');

/*
*	Allocate the Oracle database pool
*/

const connectionPool = oracledb.createPool({
	user: 'APEX_PUBLIC_USER',
	password: 'manager',
	connectString: 'localhost:1521/TEST',
	poolMin: 10,
	poolMax: 1000,
	poolIncrement: 10,
	queueRequests: false,
	queueTimeout: 1000
});

connectionPool.catch(e => {
	console.error(`Unable to create database pool.\n${e.message}`);
	process.exit(1);
});

/*
*	Start the server
*/

const PORT = 8000;
const PATH = '/apex';
const OPTIONS = {
	trace: 'on',
	defaultPage: 'apex',
	doctable: 'wwv_flow_file_objects$',
	pathAlias: {
		alias: 'r',
		procedure: 'wwv_flow.resolve_friendly_url'
	},
	errorStyle: 'debug'
};

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
app.use(PATH + '/:name?', webplsql(connectionPool, OPTIONS));

// serving static files
const staticFilesPath = path.resolve('/Middleware/apex/images/');
app.use('/i/', express.static(staticFilesPath));

// listen on port
console.log(`Listening on http://localhost:${PORT}${PATH}`);
app.listen(PORT);
