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

# Admin Console

`web_plsql` includes a built-in Admin Console for real-time monitoring and management of your gateway.

## Features
- **Dashboard**: Real-time charts showing requests per second and error rates.
- **Pool Monitoring**: Visual representation of database connection pool usage.
- **Cache Management**: View and manage the metadata cache.
- **Access & Error Logs**: Interactive viewers for the server logs.
- **System Info**: Overview of the server environment and configuration.

## Configuration
The admin console is enabled by default in the `startServer` API. You can configure it via the `admin` property in the main configuration object.

```typescript
/**
 * @typedef {object} configAdminType
 * @property {boolean} [enabled=true] - Whether the admin console is enabled.
 * @property {string} [route='/admin'] - The route path for the admin console.
 */
```

Access the console at `http://localhost:<port>/admin` (e.g., `http://localhost:8080/admin`).

# Configuration

There are 2 options on how to use the web_plsql express middleware:
- Use the predefined `startServer` api in `src/server.js` like in the `examples/config-native.js` example
- Hand craft a new Express server using the `handlerWebPlSql` middleware in `src/handlerPlSql.js`

## Use the predefined `startServer`

The `startServer` api uses the following configuration object:

```typescript
/**
 * @typedef {'basic' | 'debug'} errorStyleType
 */

/**
 * @typedef {object} configStaticType
 * @property {string} route - The Static route path.
 * @property {string} directoryPath - The Static directory.
 */

/**
 * @typedef {(connection: Connection, procedure: string) => void | Promise<void>} transactionCallbackType
 * @typedef {'commit' | 'rollback' | transactionCallbackType | undefined | null} transactionModeType
 */

/**
 * @typedef {object} configPlSqlHandlerType
 * @property {string} defaultPage - The default page.
 * @property {string} [pathAlias] - The path alias.
 * @property {string} [pathAliasProcedure] - The path alias.
 * @property {string} documentTable - The document table.
 * @property {string[]} [exclusionList] - The exclusion list.
 * @property {string} [requestValidationFunction] - The request validation function.
 * @property {Record<string, string>} [cgi] - The additional CGI.
 * @property {transactionModeType} [transactionMode='commit'] - Specifies an optional transaction mode.
 * "commit" this automatically commits any open transaction after each request. This is the defaults because this is what mod_plsql and ohs are doing.
 * "rollback" this automatically rolles back any open transaction after each request.
 * "transactionCallbackType" this allows to defined a custom handler as a JavaScript function.
 * @property {errorStyleType} errorStyle - The error style.
 */

/**
 * @typedef {object} configPlSqlConfigType
 * @property {string} route - The PL/SQL route path.
 * @property {string} user - The Oracle username.
 * @property {string} password - The Oracle password.
 * @property {string} connectString - The Oracle connect string.
 */

/**
 * @typedef {configPlSqlHandlerType & configPlSqlConfigType} configPlSqlType
 */

/**
 * @typedef {object} configType
 * @property {number} port - The server port number.
 * @property {configAdminType} [admin] - The admin console configuration.
 * @property {configStaticType[]} routeStatic - The static routes.
 * @property {configPlSqlType[]} routePlSql - The PL/SQL routes.
 * @property {number} [uploadFileSizeLimit] - Maximum size of each uploaded file in bytes or no limit if omitted.
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
```typescript
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
			transactionMode: 'commit',
			errorStyle: 'debug', // PlsqlErrorStyle
		},
	],
	uploadFileSizeLimit: 50 * 1024 * 1024, // 50MB
	loggerFilename: 'access.log', // PlsqlLogEnable and PlsqlLogDirectory
}
```

## Create a custom Express application based on the default server implemented in `src/server.js`.

...

# Configuration options

## Supported mod_plsql configuration options
- PlsqlDatabaseConnectString -> routePlSql[].connectString
- PlsqlDatabaseUserName -> routePlSql[].user
- PlsqlDatabasePassword -> routePlSql[].password
- PlsqlDefaultPage -> routePlSql[].defaultPage
- PlsqlDocumentTablename -> routePlSql[].documentTable
- PlsqlErrorStyle -> routePlSql[].errorStyle
- PlsqlLogEnable -> loggerFilename
- PlsqlLogDirectory -> loggerFilename
- PlsqlPathAlias -> routePlSql[].pathAlias
- PlsqlPathAliasProcedure -> routePlSql[].pathAliasProcedure
- Default exclusion list.
- PlsqlRequestValidationFunction -> routePlSql[].pathAliasProcedure
- PlsqlExclusionList
- Basic and custom authentication methods, based on the OWA_SEC package and custom packages.

## Features that are only available in web_plsql
- The option `transactionModeType` specifies an optional transaction mode.
  "commit" this automatically commits any open transaction after each request. This is the defaults because this is what mod_plsql and ohs are doing.
  "rollback" this automatically rolles back any open transaction after each request.
  "transactionCallbackType" this allows to defined a custom handler as a JavaScript function.

## Features that are planned to be available in web_plsql
- Support for APEX 5 or greater.

## Configuration options that will not be supported:
- PlsqlAlwaysDescribeProcedure
- PlsqlAfterProcedure
- PlsqlBeforeProcedure
- PlsqlCGIEnvironmentList
- PlsqlDocumentProcedure
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
