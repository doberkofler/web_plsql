const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const multipart = require('connect-multiparty');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const statusMonitor = require('express-status-monitor')();

const oracleExpressMiddleware = require('../dist');

// configuration
const CONFIG = {
	oracleUser: 'sample',
	oraclePassword: 'sample',
	oracleConnection: 'localhost:1521/TEST',
	doctable: 'docTable'
};
const PORT = 8000;
const PATH = '/base';

// create express app
console.log('Starting the Oracle PL/SQL Express Middleware example...');
const app = express();

// setup the logger
const accessLogStream = fs.createWriteStream(path.join(process.cwd(), 'access.log'), {flags: 'a'});
app.use(morgan('combined', {stream: accessLogStream}));

// serving static files
app.use('/static', express.static(path.join(process.cwd(), 'examples/static')));

// add middleware
app.use(multipart());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(compression());

// add the oracle pl/sql express middleware
app.use(PATH + '/:name?', oracleExpressMiddleware(CONFIG));

// add a default page
app.route(PATH).get((req, res/*, next*/) => {
	res.redirect(PATH + '/sample.pageIndex');
});

// status monitor
app.use(statusMonitor);

// listen on port
console.log(`Waiting on http://localhost:${PORT}${PATH}`);
app.listen(PORT);
