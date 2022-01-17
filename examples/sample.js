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
*	Holds the credentials used by node-oracledb examples to connect
*	to the database.  Production applications should consider using
*	External Authentication to avoid hard coded credentials.
*/
const dbConfig = require('./credentials.js');

/*
*	Allocate the Oracle database pool
*/

const connectionPool = oracledb.createPool({
	user: dbConfig.user,					// The database user name.
	password: dbConfig.password,			// The password of the database user.
	connectString: dbConfig.connectString,	// The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
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

const PORT = 8000;
const PATH = '/base';
const OPTIONS = {
	trace: 'on',
	defaultPage: 'sample.pageIndex',
	doctable: 'docTable',
	pathAlias: {
		alias: 'myalias',
		procedure: 'sample.pagePathAlias'
	},
	errorStyle: 'debug'
};

// Welcome message
console.log(`Welcome to web_plsql version ${webplsql.version}!`);

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
app.use(require('express-status-monitor')());
console.log(`Express status monitor is listening on http://localhost:${PORT}/status`);

// add the oracle pl/sql express middleware
app.use(PATH + '/:name?', webplsql(connectionPool, OPTIONS));

// serving static files
app.use('/static', express.static(path.join(process.cwd(), 'examples/static')));

// shutdown
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

// listen on port
console.log(`Sample app is listening on http://localhost:${PORT}${PATH}`);
const server = app.listen(PORT);

function shutDown() {
	console.log('Received kill signal, shutting down gracefully');
	server.close(() => {
		console.log('Closed out remaining connections');
		process.exit(0);
	});

	setTimeout(() => {
		console.error('Could not close connections in time, forcefully shutting down');
		process.exit(1);
	}, 10000);
}
