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

## Native
* Change to the `examples/sql` directory, start SQLPLus, connect to the database as SYS specifying the SYSDBA roleInstall and install the sample schema `@examples/sql/install.sql`.
* Start server using `node examples/config-native.js` after having set the WEB_PLSQL_ORACLE_SERVER environment variable to the database where you just installed the sample schema.
* Invoke a browser and open the page `http://localhost/sample`.

## Container
* Build the image using `npm run image-build`.
* Adapt the `examples/config-docker.json` configuration file. Typically only the `connectString` property must be changed.
* Start the container using `docker compose up -d`.

# Configuration

There are 2 options on how to use the web_plsql express middleware:
- Use the predefined `startServer` api in `src/server.js` like in the `examples/config-native.js` example
- Hand craft a new Express server using the `handlerWebPlSql` middleware in `src/handlerPlSql.js`

## Use the predefined `startServer`

The `startServer` api uses the following configuration object:

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
 */
```

## Hand craft a new Express server using the `handlerWebPlSql` middleware

WIP

# Compare with mod_plsql

The following mod_plsql DAD configuration translates to the configuration options as follows:

**DAD**
```
<Location /pls/sample>
  SetHandler                     pls_handler
  Order                          deny,allow
  Allow                          from all
  PlsqlDatabaseUsername          sample
  PlsqlDatabasePassword          sample
  PlsqlDatabaseConnectString     localhost:1521/ORCL
  PlsqlDefaultPage               sample_pkg.pageIndex
  PlsqlDocumentTablename         doctable
  PlsqlPathAlias                 myalias
  PlsqlPathAliasProcedure        sample_pkg.page_path_alias
  PlsqlExclusionList             sample_pkg.page_exclusion_list
  PlsqlRequestValidationFunction sample_pkg.request_validation_function
  PlsqlErrorStyle                DebugStyle
  PlsqlNlsLanguage               AMERICAN_AMERICA.UTF8
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
			user: 'sample', // PlsqlDatabaseUserName
			password: 'sample', // PlsqlDatabasePassword
			connectString: 'localhost:1521/ORCL', // PlsqlDatabaseConnectString
			defaultPage: 'sample_pkg.page_index', // PlsqlDefaultPage
			documentTable: 'doctable', // PlsqlDocumentTablename
			exclusionList: ['sample_pkg.page_exclusion_list'], // PlsqlExclusionList
			requestValidationFunction: 'sample_pkg.request_validation_function', // PlsqlRequestValidationFunction
			pathAlias: 'myalias', // PlsqlPathAlias
			pathAliasProcedure: 'sample_pkg.page_path_alias', // PlsqlPathAliasProcedure
			errorStyle: 'debug', // PlsqlErrorStyle
		},
	],
	loggerFilename: 'access.log', // PlsqlLogEnable and PlsqlLogDirectory
}
```

## Create a custom Express application based on the default server implemented in `src/server.js`.

...

# Configuration options

## Supported mod_plsql configuration options
- PlsqlDatabaseConnectString
- PlsqlDatabaseUserName
- PlsqlDatabasePassword
- PlsqlDefaultPage
- PlsqlDocumentTablename
- PlsqlErrorStyle
- PlsqlLogEnable
- PlsqlLogDirectory
- PlsqlPathAlias
- PlsqlPathAliasProcedure
- Default exclusion list.
- PlsqlRequestValidationFunction
- PlsqlExclusionList
- Basic and custom authentication methods, based on the OWA_SEC package and custom packages.

## Features that are planned to be available in web_plsql
- Support for APEX 5 or greater.

## Configuration options that will not be supported:
- PlsqlDocumentProcedure
- PlsqlAfterProcedure
- PlsqlAlwaysDescribeProcedure
- PlsqlBeforeProcedure
- PlsqlCGIEnvironmentList
- PlsqlDocumentPath
- PlsqlIdleSessionCleanupInterval
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
