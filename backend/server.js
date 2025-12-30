const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database connection
console.log('NODE_ENV:', process.env.NODE_ENV);
if (process.env.NODE_ENV !== 'demo') {
  console.log('Attempting MongoDB connection...');
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workplan')
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.log('Set NODE_ENV=demo to run in demo mode without database');
    process.exit(1);
  });
} else {
  console.log('Running in demo mode - no database required');
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/schedule', require('./routes/schedule'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 handler called for:', req.method, req.url);
  res.status(404).json({ error: 'Route not found' });
});

console.log('About to start server...');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Routes loaded successfully');
});

module.exports = app;