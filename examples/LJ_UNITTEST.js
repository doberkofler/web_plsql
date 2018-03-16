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
*	The 'unhandledRejection' event is emitted whenever a Promise is rejected and no error handler is attached to the promise within a turn of the event loop.
*/
process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection', reason, p);
	process.exit(1);
});

/*
*	Allocate the Oracle database pool
*/

const PASSWORD = process.env.LJ_UNITTEST_PASSWORD || '';
const connectionPool = oracledb.createPool({
	user: 'LJ_UNITTEST',					// The database user name.
	password: PASSWORD,						// The password of the database user.
	connectString: 'localhost:1521/TEST',	// The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
	poolMin: 10,							// The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
	poolMax: 1000,							// The maximum number of connections to which a connection pool can grow.
	poolIncrement: 10,						// The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
	queueRequests: false,					// If this property is false and a request for a connection is made from a pool where the number of “checked out” connections has reached poolMax, then an ORA-24418 error indicating that further sessions cannot be opened will be returned.
	queueTimeout: 1000						// The number of milliseconds after which connection requests waiting in the connection request queue are terminated. If queueTimeout is 0, then queued connection requests are never terminated.
});

connectionPool.catch(e => {
	console.error(`Unable to create database pool.\n${e.message}`);
	process.exit(1);
});

/*
*	Start the server
*/

const PORT = 8888;
const ROOT = '/lj_unittest';
const STATIC_ROOT = '/q/p/lj_unittest/';
const STATIC_PATH = process.env.PERISCOPE_DEPLOY_DIR || '';
const OPTIONS = {
	trace: 'on',
	defaultPage: 'LAS_DLG_Startup.GO',
	doctable: 'ljp_documents'
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
app.use(ROOT + '/:name?', webplsql(connectionPool, OPTIONS));

// serving static files
console.log(`Serving static files on http://localhost:${PORT}${STATIC_ROOT} from ${STATIC_PATH}`);
app.use(STATIC_ROOT, express.static(STATIC_PATH));

// listen on port
console.log(`Listening on http://localhost:${PORT}${ROOT}`);
app.listen(PORT);
