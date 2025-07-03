// middleware/sessionMiddleware.js
require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
  }),
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
});

module.exports = sessionMiddleware;
