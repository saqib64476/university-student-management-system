/**
 * University Student Management System
 * Express Server & REST API Entrypoint
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const sessionMiddleware = require('./config/session');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const studentRoutes = require('./routes/studentRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const marksRoutes = require('./routes/marksRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and parsing middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session configuration
app.use(sessionMiddleware);

// Serve static frontend assets
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/marks', marksRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const db = require('./config/db');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dbMode: db.getDbMode(),
    user: req.session?.user ? req.session.user.email : null
  });
});

// Root redirects
app.get('/login', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

app.get('*', (req, res, next) => {
  // If requesting an API route that wasn't matched, delegate to notFoundHandler
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Otherwise serve index.html
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 & Error Handler Middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start HTTP server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎓 University Student Management System Server`);
  console.log(`🌐 Web App running at: http://localhost:${PORT}`);
  console.log(`🔐 Admin Login:       admin@university.edu / Admin@123`);
  console.log(`⚙️  Environment:       ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);
});

module.exports = app;
