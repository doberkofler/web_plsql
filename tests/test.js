// @flow

const express = require('express');
const oracleExpressMiddleware = require('../dist');

const CONFIG = {
	oracleUser: 'LJ_UNITTEST',
	oraclePassword: 'DTRELKMARPAT',
	oracleConnection: 'localhost:1521/TEST'
};

const port = 7000;
const app = express();

app.use('/oracleExpressMiddleware', oracleExpressMiddleware(CONFIG));

console.log(`Waiting on http://localhost:${port}`);
app.listen(port);
