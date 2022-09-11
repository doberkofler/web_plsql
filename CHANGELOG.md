# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [?.?.?] - ????-??-??

### Added
### Changed
### Fixed


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
