# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed


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
