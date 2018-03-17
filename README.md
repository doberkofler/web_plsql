[![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status](https://coveralls.io/repos/doberkofler/node_plsql/badge.svg)](https://coveralls.io/r/doberkofler/node_plsql)

# Oracle PL/SQL Gateway Middleware for the Express web framework for Node.js
This Express Middleware is a bridge between a PL/SQL application running in an Oracle Database and an Express web server for Node.js.
It is an open-source alternative to mod_plsql, the Embedded PL/SQL Gateway and ORDS,
allowing you to develop PL/SQL web applications using the PL/SQL Web Toolkit (OWA) and Oracle Application Express (Apex),
and serve the content using the Express web framework for Node.js.

Please feel free to try and suggest any improvements. Your thoughts and ideas are most welcome.

# Release History
See the [changelog](https://github.com/doberkofler/web_plsql/blob/master/CHANGELOG.md).

# Installation

## Prerequisites
There are several prerequisites needed to both compile and run the Oracle database driver.
Please visit the [node-oracledb INSTALL.md](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md) page for more information.

## Installing
* Create and move to a new directory
* Create a new npm project (`npm init`)
* Install package (`npm install web_plsql`)
* Install the PL/SQL examples (`sqlplus node_modules/web_plsql/examples/sql/install.sql`)
* Start the sample server (`node node_modules/web_plsql/examples/sample`)
* Invoke a browser and open the page `http://localhost:8000/base`

# Configuration

## How does a mod_plsql DAD configuration compare to the web_plsql app

```
<Location /pls/sample>
  SetHandler                    pls_handler
  Order                         deny,allow
  Allow                         from all
  PlsqlDatabaseUsername         sample
  PlsqlDatabasePassword         sample
  PlsqlDatabaseConnectString    ORCL
  PlsqlAuthenticationMode       Basic
  PlsqlDefaultPage              sample.pageindex
  PlsqlDocumentTablename        doctable
  PlsqlErrorStyle               DebugStyle
  PlsqlNlsLanguage              AMERICAN_AMERICA.UTF8
</Location>
```

```javascript
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

const databasePool = oracledb.createPool({
	user: 'sample',
	password: 'sample',
	connectString: 'ORCL',
	poolMin: 10,
	poolMax: 1000,
	poolIncrement: 10,
	queueRequests: false,
	queueTimeout: 1000
});

databasePool.catch(e => {
	console.error(`Unable to create database pool.\n${e.message}`);
	process.exit(1);
});

/*
*	Start the server
*/

const PORT = 8000;
const PATH = '/pls/sample';
const OPTIONS = {
	defaultPage: 'sample.pageIndex',
	doctable: 'docTable'
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
app.use(PATH + '/:name?', webplsql(databasePool, OPTIONS));

// serving static files
app.use('/static', express.static(path.join(process.cwd(), 'examples/static')));

// listen on port
console.log(`Waiting on http://localhost:${PORT}${PATH}`);
app.listen(PORT);
```

[downloads-image]: http://img.shields.io/npm/dm/node_plsql.svg
[npm-url]: https://npmjs.org/package/web_plsql
[travis-url]: http://travis-ci.org/doberkofler/web_plsql
[travis-image]: https://travis-ci.org/doberkofler/web_plsql.svg?branch=master
