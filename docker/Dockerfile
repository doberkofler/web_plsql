FROM node:24-alpine

# Environment
ENV WEB_PLSQL_WORKDIR=/opt/server
ENV WEB_PLSQL_TIMEZONE="UTC"
ENV WEB_PLSQL_CERTIFICATE=""

# Workdir
WORKDIR ${WEB_PLSQL_WORKDIR}

# Copy resources
COPY package.json server.js ${WEB_PLSQL_WORKDIR}

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
RUN npm i

# Create shared static directories
RUN mkdir static

# Run server
CMD ["node", "./server.js"]