// @flow

const express = require('express');
const mw = require('./dist');

const port = 3000;
const app = express();

app.use(mw({user: 'LJ_UNITTEST', password: 'DTRELKMARPAT', connectString: 'localhost:1521/TEST'}));

console.log(`Waiting on http://localhost:${port}`);
app.listen(port);
