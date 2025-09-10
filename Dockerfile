# syntax=docker/dockerfile:1

ARG WEB_PLSQL_BASE_IMAGE=node:24-alpine

#
# STEP 1 - build
#

FROM ${WEB_PLSQL_BASE_IMAGE} AS build

# Environment
ENV WEB_PLSQL_WORKDIR=/opt/server
ENV WEB_PLSQL_TIMEZONE="UTC"
ENV WEB_PLSQL_CERTIFICATE=""

# Workdir
WORKDIR ${WEB_PLSQL_WORKDIR}

# Copy resources
COPY package.json ${WEB_PLSQL_WORKDIR}
COPY src ${WEB_PLSQL_WORKDIR}/src/
COPY docker-main.js ${WEB_PLSQL_WORKDIR}/

# Timezone
RUN apk add --no-cache tzdata && \
	cp /usr/share/zoneinfo/${WEB_PLSQL_TIMEZONE} /etc/localtime && \
	echo "${WEB_PLSQL_TIMEZONE}" >  /etc/timezone

# Certificate
RUN if [ -n "$WEB_PLSQL_CERTIFICATE" ]; then \
		apk add --no-cache openssl; \
		openssl req -nodes -new -x509 -keyout key.pem -out cert.pem -days 365 -subj "$WEB_PLSQL_CERTIFICATE"; \
	fi

# Install dependencies
RUN npm i --omit=dev --no-audit --no-fund --ignore-scripts

#
# STEP 2 - run
#

FROM ${WEB_PLSQL_BASE_IMAGE} AS run

# Environment
ENV WEB_PLSQL_WORKDIR=/opt/server
ENV WEB_PLSQL_TIMEZONE=""
ENV NODE_ENV=production
ENV TZ=${WEB_PLSQL_TIMEZONE}

# Workdir
WORKDIR ${WEB_PLSQL_WORKDIR}

# Create shared static directories
RUN apk add --no-cache mc && \
	npm i npm -g && \
	mkdir static

# Copy resources from build step
COPY --from=build /etc/localtime /etc/localtime
COPY --from=build /etc/timezone /etc/timezone
COPY --from=build ${WEB_PLSQL_WORKDIR}/package.json ${WEB_PLSQL_WORKDIR}/package.json
COPY --from=build ${WEB_PLSQL_WORKDIR}/package-lock.json ${WEB_PLSQL_WORKDIR}/package-lock.json
COPY --from=build ${WEB_PLSQL_WORKDIR}/node_modules ${WEB_PLSQL_WORKDIR}/node_modules
COPY --from=build ${WEB_PLSQL_WORKDIR}/src/*.js ${WEB_PLSQL_WORKDIR}/src/
COPY --from=build ${WEB_PLSQL_WORKDIR}/*.pem ${WEB_PLSQL_WORKDIR}/
COPY --from=build ${WEB_PLSQL_WORKDIR}/docker-main.js ${WEB_PLSQL_WORKDIR}/

# Run server
CMD ["node", "./docker-main.js"]
