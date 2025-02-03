#!/bin/sh

if [ -z "${ORACLE_SERVER}" ]; then
	echo "ORACLE_SERVER is unset or empty"
fi

node src/server.js \
	--port=80 \
	--route-app=/base \
	--route-static=/static \
	--route-static-path=examples/static \
	--user=sample \
	--password=sample \
	--server=$ORACLE_SERVER \
	--default-page=sample.pageIndex \
	--path-alias=myalias:sample.pagePathAlias \
	--document-table=doctable \
	--error-style=debug
