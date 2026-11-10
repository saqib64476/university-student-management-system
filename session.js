/**
 * Express Session Configuration
 * Production-ready session settings with secure cookie handling
 */

const session = require('express-session');
require('dotenv').config();

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'sms_production_university_secure_secret_9981',
  name: 'sms_session_id',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

module.exports = session(sessionConfig);
