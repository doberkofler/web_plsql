#!/bin/sh

if [ -z "${ORACLE_SERVER}" ]; then
	echo "ORACLE_SERVER is unset or empty"
fi

node src/server.js \
	--port=8080 \
	--route-app=/apex \
	--route-static=/i/ \
	--route-static-path=/apex/images \
	--user=APEX_PUBLIC_USER \
	--password=secret \
	--server=$ORACLE_SERVER \
	--default-page=apex \
	--path-alias=r:wwv_flow.resolve_friendly_url \
	--document-table=wwv_flow_file_objects$
