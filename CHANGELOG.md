# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [?.?.?] - ????-??-??

### Added
### Changed
### Fixed

## [1.2.0] - 2026-02-09

- Add "Request tracing" page for comprehensive request tracing.
- Improved "Errors" page UX.
- Improved "Access log" page UX.
- Reduced amount of data needed for apage refreshes.
- Detect loss of connection and add reconnection dialog.


## [1.1.0] - 2026-02-08

### Added
- Major boost of unit test coverage now 95%.
- Added performance regression testing.

### Changed
- Updated all dependencies to latest versions.


## [1.0.0] - 2026-02-07

### Added
- Introduced the new admin console middleware that allows to control and manage the web_plsql middleware.
- Implemented `OWAPageStream` class that extends Node.js `Readable` stream to fetch page content in chunks and pipe directly to the HTTP response.


## [0.19.0] - 2026-02-06

### Added
- Scoped Caching: Implemented per-handler caches to prevent conflicts.
- Security: Added dbms_utility.name_resolve for safer procedure name handling.
- Robustness: Added automatic cache invalidation on specific ORA errors.
- Utilities: Added new cache utility and test files.


## [0.18.0] - 2026-02-06

### Added
- Refactored how file downloads are handled moving from buffering streams into memory to directly piping the stream to the response.

### Changed
- Migrated to vitest.
- Improved unit tests.


## [0.17.1] - 2026-02-05

### Changed
- Automatically update the getVersion api.
- Updated all dependencies to latest versions.


## [0.17.0] - 2026-01-26

### Changed
- Separated procedure invocation so only main procedure will be shown when an error occurs.
- Updated all dependencies to latest versions.


## [0.16.1] - 2025-12-09

### Fixed
- Fix version.


## [0.16.0] - 2025-12-09

### Added
- Improved error handling.
- Improved tracing.

### Changed
- Updated all dependencies to latest versions.

### Fixed
- Allow to submit more named parameters than defined in procedure.


## [0.15.1] - 2025-11-27

### Added
- Add api `getVersion` to retrieve the current package version and show it in `showConfig`.


## [0.15.0] - 2025-11-27

### Added
- Add configuration option `uploadFileSizeLimit` to limit the max file size on uploads.
- Increased the limits for `express.json` and `express.urlencoded` to 50MB.

### Changed
- Updated all dependencies to latest versions.


## [0.14.2] - 2025-11-02

### Fixed
- Type `transactionCallbackType` now offers procedure.


## [0.14.1] - 2025-11-02

### Fixed
- Small fix in TypeScript types.


## [0.14.0] - 2025-11-02

### Added
- The option `transactionModeType` specifies an optional transaction mode.<br>
"commit" this automatically commits any open transaction after each request. This is the defaults because this is what mod_plsql and ohs are doing.<br>
"rollback" this automatically rolles back any open transaction after each request.<br>
"transactionCallbackType" this allows to defined a custom handler as a JavaScript function.

### Changed
- Updated all dependencies to latest versions.

### Fixed
- The filename of uploaded files now has the some format as in ords and mod_plsql by including the actual filename after a slash at the end.


## [0.13.2] - 2025-09-22

### Changed
- Updated all dependencies to latest versions.


## [0.13.1] - 2025-09-10

### Fixed
- Fixed documentation.


## [0.13.0] - 2025-09-10

### Added
- Add handling to keep track of connections and close them at shutdown.
- Add a simple cli console to quit server.

### Changed
- Improved metrics handler.
- Removed configuration option `monitorConsole`.
- Updated all dependencies to latest versions.

### Fixed
- Fixed a problem with cookies that did not have all options properly set.


## [0.12.1] - 2025-09-04

### Fixed
- Fixed regression with removed version API.


## [0.12.0] - 2025-09-04

### Changed
- Updated all dependencies to latest versions.

### Fixed
- Removed version API.


## [0.11.0] - 2025-08-22

### Changed
- Updated all dependencies to latest versions.

### Fixed
- Fixed a problem causing file uploads to fail.

## [0.10.0] - 2025-08-18

### Changed
- Make oracledb a peer dependency.
- Updated all dependencies to latest versions.


## [0.9.0] - 2025-04-15

### Added
- Improved configuration on container environments.


## [0.8.0] - 2025-04-15

### Added
- Add support for docker container.


## [0.7.0] - 2025-04-14

### Changed
- Support for Express 5.1.0 or higher.
- Updated all dependencies to latest versions.

## [0.6.0] - 2025-02-09

### Changed
- Reimplement using native JavaScript code with JSDOC type annotations.
- Improved API and examples.
- Add support for PlsqlExclusionList parameter.
- Add support for PlsqlRequestValidationFunction.
- Show  use of basic and custom authentication methods.
- Switch to ESM.
- Support for NodeJS 22 or higher.
- Updated all dependencies to latest versions.


## [0.5.2] - 2023-02-26

### Fixed
- Updated all dependencies.


## [0.5.1] - 2022-09-11

### Fixed
- Updated all dependencies.


## [0.5.0] - 2022-05-09

### Changed
- Replaced mocha with jest.
- Added support for node 18.

### Fixed
- Updated all dependencies.


## [0.4.2] - 2022-01-17

### Changed
- node.js support starting with v16.

### Fixed
- Updated all dependencies.


## [0.4.1] - 2021-08-30

### Fixed
- Updated all dependencies.


## [0.4.0] - 2021-04-09

### Added
- Added a simple oracledb example "examples/oracledb_example.js".

### Changed
- The credentials for the "examples/sample.js" are stored in "examples/credentials.js" and can also be set using the environment.

### Fixed
- Updated to oracledb 5 and full binary support for node 14 and later.
- Updated all minor dependencies.


## [0.3.2] - 2020-03-29

### Fixed
- Updated all minor dependencies.


## [0.3.1] - 2020-02-19

### Fixed
- Updated all minor dependencies.


## [0.2.0] - 2019-06-02

## [0.2.0] - 2019-06-02

### Fixed
- Fixed a problem with the dependencies when installing the npm package.
- Fixed link to the official oracledb installation documentation.
- Updated all dependencies.


## [0.1.2] - 2019-03-02

### Fixed
- Updated all dependencies.


## [0.1.1] - 2019-02-05

### Changed
- Migrated from Babel to TypeScript

### Fixed
- Updated all dependencies.


## [0.1.0] - 2018-09-03

### Added
- Added the configuration open "errorStyle" that can be set to "basic" or "debug".
- The current web_plsql version is now a string property "version" in the middleware object.
- Added the express status monitor to the sample. (http://localhost:8000/status)

### Fixed
- When downloading a file, first send any eventual "other headers" like "Content-Disposition".
- Changed x-db-xontent-length to x-db-content-length.
- Updated all dependencies.


## [0.0.3] - 2018-03-20

### Added
- Added support for the PlsqlPathAlias and PlsqlPathAliasProcedure DAD settings.
- Partial support of APEX application.
- Added example configuration for APEX application.
- Added unit tests with a code coverage of over 90%.

### Fixed
- Fixed some edge cases when processing the http headers.


## [0.0.2] - 2018-03-19

### Added
- Allow to add or override CGI environment variables using the "cgi" property in the configuration object.
- Added unit tests with a code coverage of over 80%.

### Fixed
- Fixed wrong field name when uploading files using a form.


## [0.0.1] - 2018-03-17

- Initial release
