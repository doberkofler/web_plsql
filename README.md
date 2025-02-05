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

# Prerequisites
The connection to the Oracle Database uses the node-oracledb Driver for Oracle Database. 
Please visit the [node-oracledb](https://node-oracledb.readthedocs.io/en/latest/index.html) documentation for more information.

# Installing
* Create and move to a new directory
* Create a new npm project (`npm i`)
* Install package (`npm i --omit=dev web_plsql`)

# Example
* Change to the `examples/sql` directory, start SQLPLus, connect to the database as SYS specifying the SYSDBA roleInstall and install the sample schema `@examples/sql/install.sql`.
* Start the sample server using `node server_sample.js` after having set the ORACLE_SERVER environment variable to the database where you just installed the sample schema.
* Invoke a browser and open the page `http://localhost/base`.

# Running
There are 2 main options on how to use the mod_plsql Express middleware:

## Make a copy of the `server_sample.js` sample script and configure it accordingly to your needs.

The the default server implemented in `src/server.js` and has the following configuration options:
```
/**
 * @typedef {'basic' | 'debug'} errorStyleType
 */
export const z$errorStyleType = z.enum(['basic', 'debug']);

/**
 * @typedef {{alias: string, procedure: string}} pathAliasType
 */

/**
 * @typedef {object} configStaticType
 * @property {string} route - The Static route path.
 * @property {string} directoryPath - The Static directory.
 */

/**
 * @typedef {object} configPlSqlType
 * @property {string} route - The PL/SQL route path.
 * @property {string} user - The Oracle username.
 * @property {string} password - The Oracle password.
 * @property {string} connectString - The Oracle connect string.
 * @property {string} defaultPage - The default page.
 * @property {pathAliasType} [pathAlias] - The path alias.
 * @property {string} documentTable - The document table.
 */

/**
 * @typedef {object} configType
 * @property {number} port - The server port number.
 * @property {configStaticType[]} routeStatic - The static routes.
 * @property {configPlSqlType[]} routePlSql - The PL/SQL routes.
 * @property {errorStyleType} errorStyle - The error style.
 * @property {string} loggerFilename - name of the request logger filename or '' if not required.
 * @property {boolean} monitorConsole - Enable console status monitor.
 */
```

The following mod_plsql DAD configuration translates to the configuration options as follows:

**DAD**
```
<Location /pls/sample>
  SetHandler                    pls_handler
  Order                         deny,allow
  Allow                         from all
  PlsqlDatabaseUsername         sample
  PlsqlDatabasePassword         sample
  PlsqlDatabaseConnectString    localhost:1521/ORCL
  PlsqlDefaultPage              sample.pageIndex
  PlsqlDocumentTablename        doctable
  PlsqlErrorStyle               DebugStyle
  PlsqlNlsLanguage              AMERICAN_AMERICA.UTF8
</Location>
```

**mod_plsql**
```
{
	port: 80,
	routeStatic: [
		{
			route: '/static',
			directoryPath: 'examples/static',
		},
	],
	routePlSql: [
		{
			route: '/sample',
			user: 'sample',
			password: 'sample',
			connectString: 'localhost:1521/ORCL',
			defaultPage: 'sample.pageIndex',
			documentTable: 'doctable',
		},
	],
	errorStyle: 'debug',
	loggerFilename: 'access.log',
	monitorConsole: false,
}
```

## Create a custom Express application based on the default server implemented in `src/server.js`.

...

# Configuration options

## Supported mod_plsql configuration options
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

## Configuration options that will not be supported:
- PlsqlAfterProcedure
- PlsqlAlwaysDescribeProcedure
- PlsqlBeforeProcedure
- PlsqlCGIEnvironmentList
- PlsqlDocumentPath
- PlsqlIdleSessionCleanupInterval
- PlsqlSessionCookieName
- PlsqlSessionStateManagement
- PlsqlTransferMode

## Features that are planned to be available in web_plsql
- PlsqlDocumentProcedure
- PlsqlExclusionList
- PlsqlRequestValidationFunction
- Support for APEX 5.
- Default exclusion list.
- Basic and custom authentication methods, based on the OWA_SEC package and custom packages.


# License

[MIT](LICENSE)


[npm-image]: https://img.shields.io/npm/v/web_plsql.svg
[npm-url]: https://npmjs.org/package/web_plsql

[downloads-image]: https://img.shields.io/npm/dm/web_plsql.svg
[downloads-url]: https://npmjs.org/package/web_plsql

[appveyor-image]: https://ci.appveyor.com/api/projects/status/github/doberkofler/web_plsql?branch=master&svg=true
[appveyor-url]: https://ci.appveyor.com/project/doberkofler/web-plsql
