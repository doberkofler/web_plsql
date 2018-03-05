const express = require('express');
const oracleExpressMiddleware = require('../dist');

const app = express();
app.use('/base/:name?', oracleExpressMiddleware({oracleUser: 'sample', oraclePassword: 'sample'}));
app.listen(8000);
