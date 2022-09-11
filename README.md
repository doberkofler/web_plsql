  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Linux Build](https://travis-ci.org/doberkofler/web_plsql.svg?branch=master)](https://travis-ci.org/doberkofler/web_plsql)
  [![Build status][appveyor-image]][appveyor-url]
  [![Coverage Status](https://coveralls.io/repos/github/doberkofler/web_plsql/badge.svg?branch=master)](https://coveralls.io/github/doberkofler/web_plsql?branch=master)

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
Please visit the [node-oracledb INSTALL.md](https://oracle.github.io/node-oracledb/INSTALL.html) page for more information.
On where Oracle is looking for the client consult: https://oracle.github.io/node-oracledb/doc/api.html#oracleclientloading

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
  doctable: 'docTable',
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
app.use(PATH + '/:name?', webplsql(databasePool, OPTIONS));

// serving static files
app.use('/static', express.static(path.join(process.cwd(), 'examples/static')));

// listen on port
console.log(`Waiting on http://localhost:${PORT}${PATH}`);
app.listen(PORT);
```

# Missing features

## Supported mod_plsql configuration options:
- PlsqlDatabaseConnectString -> specified when creating the oracledb connection pool
- PlsqlDatabaseUserName -> specified when creating the oracledb connection pool
- PlsqlDatabasePassword -> specified when creating the oracledb connection pool
- PlsqlDefaultPage -> use the "doctable" configuration option
- PlsqlDocumentTablename -> use the "defaultPage" configuration option
- PlsqlErrorStyle -> use the "errorStyle" configuration option
- PlsqlLogEnable -> use a HTTP request logger middleware for node.js like morgan
- PlsqlLogDirectory -> use a HTTP request logger middleware for node.js like morgan
- PlsqlPathAlias -> use the "pathAlias.alias" configuration option
- PlsqlPathAliasProcedure -> use the "pathAlias.procedure" configuration option

## Features in mod_plsql that are planned t be available in web_plsql:
- PlsqlDocumentPath
- PlsqlDocumentProcedure
- PlsqlExclusionList
- PlsqlRequestValidationFunction
- Support for APEX 5.
- Default exclusion list.
- Basic and custom authentication methods, based on the OWA_SEC package and custom packages.

## Configuration options that will not be supported:
- PlsqlIdleSessionCleanupInterval
- PlsqlAfterProcedure
- PlsqlAlwaysDescribeProcedure
- PlsqlBeforeProcedure
- PlsqlCGIEnvironmentList
- PlsqlSessionCookieName
- PlsqlSessionStateManagement
- PlsqlTransferMode

# License

[MIT](LICENSE)


[npm-image]: https://img.shields.io/npm/v/web_plsql.svg
[npm-url]: https://npmjs.org/package/web_plsql

[downloads-image]: https://img.shields.io/npm/dm/web_plsql.svg
[downloads-url]: https://npmjs.org/package/web_plsql

[appveyor-image]: https://ci.appveyor.com/api/projects/status/github/doberkofler/web_plsql?branch=master&svg=true
[appveyor-url]: https://ci.appveyor.com/project/doberkofler/web-plsql
