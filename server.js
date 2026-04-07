require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not set in environment variables');
}

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then(() => console.log('✅ MongoDB connected — GreenPulse DB ready'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

// API Routes
const machineRoutes = require('./routes/machines');
app.use('/api/machines', machineRoutes);

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║         🌿 GreenPulse Server             ║
  ║   AI-Based Steel Efficiency Monitoring   ║
  ╠══════════════════════════════════════════╣
  ║   🌐 http://localhost:${PORT}               ║
  ║   📊 API: http://localhost:${PORT}/api      ║
  ╚══════════════════════════════════════════╝
  `);
});
