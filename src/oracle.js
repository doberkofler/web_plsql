// @flow

// $FlowFixMe
const oracledb = require(process.env.NODE_ENV === 'test' ? './oracledb_mock' : 'oracledb');

module.exports = oracledb;
