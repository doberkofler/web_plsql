import oracledb from 'oracledb';
console.log('STRING type:', typeof oracledb.STRING);
console.log('Is DbType?', oracledb.STRING instanceof oracledb.DbType);
console.log('BIND_IN type:', typeof oracledb.BIND_IN);
console.log('BIND_IN value:', oracledb.BIND_IN);
