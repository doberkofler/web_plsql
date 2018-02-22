const express = require('express');
const bodyParser = require('body-parser');
const multipart = require('connect-multiparty');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const oracleExpressMiddleware = require('../dist');

// configuration
const CONFIG = {
	oracleUser: 'sample',
	oraclePassword: 'sample',
	oracleConnection: 'localhost:1521/TEST',
	doctable: ''
};
const myPort = 8000;
const myPath = '/base';

// create express app
console.log('Starting the Oracle PL/SQL Express Middleware example...');
const app = express();

// add middleware
app.use(multipart());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(compression());

// add the oracle pl/sql express middleware
app.use(myPath + '/:name?', oracleExpressMiddleware(CONFIG));

// add a default page
app.route(myPath).get((req, res/*, next*/) => {
	res.redirect(myPath + '/sample.pageIndex');
});

// listen on port
console.log(`Waiting on http://localhost:${myPort}${myPath}`);
app.listen(myPort);
