const functions = require('firebase-functions');
const express = require('express');
const { apiRouter } = require('../dist/server.cjs');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRouter);

exports.api = functions.https.onRequest(app);
