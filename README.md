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
* Create a new npm project (`npm init`)
* Install package (`npm i --omit=dev web_plsql`)

# Example
* Install the examples in the smaple schema (`sqlplus @examples/sql/install.sql`)
* Start the sample server (`./run_sample.sh`)
* Invoke a browser and open the page `http://localhost:8080/base`

# Running

There are 2 way to use the mod_plsql Express Middleware:
- Run the predefined Express appplication in `src/server.js`
- Create a custom Express Application and use the  mod_plsql Express Middleware

The Express appplication in `src/server.js` can be configured using command line arguments and has the following options:
```
Options:
  --port [integer]              Port to use. If 0, look for open port. (default: "0")
  --route-app [string]          Application route. (default: "/")
  --route-static [string]       Static files route. (default: "/static")
  --route-static-path [string]  Static files path. (default: "/static")
  --user [string]               Oracle database user (default: "LJ_UNITTEST")
  --password [string]           Oracle database password (default: "DTRELKMARPAT")
  --server [string]             Oracle database connect string (default: "127.0.0.1:1521/TEST")
  --default-page [string]       Default page (default: "")
  --path-alias [string]         Path alias (default: "")
  --document-table [string]     Oracle document table (default: "")
  --error-style [string]        Error style (basic or debug) (default: "basic")
  --logger                      Enable access log file (default: false)
  --monitor-console             Enable console status monitor (default: false)
  --monitor-remote              Enable remote status monitor (default: false)
  -h, --help                    display help for command
  ```

# The following mod_plsql DAD configuration translates to the web_plsql options as follows:

## DAD
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

## web_plsql
```
node src/server.js \
	--port=8080 \
	--route-app=/sample \
	--route-static=/static \
	--route-static-path=examples/static \
	--user=sample \
	--password=sample \
	--server=localhost:1521/ORCL \
	--default-page=sample.pageIndex \
	--document-table=doctable \
	--error-style=debug
```

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
