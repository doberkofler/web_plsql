#!/bin/sh

docker run \
	--detach \
	--name="web_plsql" \
	--publish="8888:8888" \
	--mount="type=bind,source=$(pwd)/examples/static,destination=/opt/web_plsql/static" \
	--mount="type=bind,source=$(pwd)/examples/server_sample.js,destination=/opt/web_plsql/config/server.js" \
	--restart="unless-stopped" \
	web_plsql
