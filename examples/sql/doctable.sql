DROP TABLE docTable;

CREATE TABLE docTable
(
	NAME			VARCHAR(128) PRIMARY KEY,
	MIME_TYPE		VARCHAR(128),
	DOC_SIZE		NUMBER,
	DAD_CHARSET		VARCHAR(128),
	LAST_UPDATED	DATE,
	CONTENT_TYPE	VARCHAR(128),
	CONTENT			LONG RAW,
	BLOB_CONTENT	BLOB
);
