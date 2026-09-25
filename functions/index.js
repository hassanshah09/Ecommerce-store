const functions = require('firebase-functions');
const express = require('express');
const { apiRouter } = require('./dist/server.cjs');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api', apiRouter);

exports.api = functions.https.onRequest(app);
