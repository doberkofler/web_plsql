// @flow

/* eslint-disable no-unused-vars */

type oracledb$connection = any;
type oracledb$connectionpool = {
	getConnection: () => Promise<oracledb$connection>
};

type oracledb$bindingDirType = number;
type oracledb$bindingTypeType = number;
type oracledb$bindingType = {
	[string]: {
		dir: oracledb$bindingDirType,
		type: oracledb$bindingTypeType,
		maxArraySize?: number,
		maxSize?: number,
		val?: mixed
	} | string | number
};

declare module 'oracledb' {
	declare module.exports: any;
}
