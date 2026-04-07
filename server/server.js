const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS) from the project root
app.use(express.static(path.join(__dirname, '..')));

// ── API ROUTES ─────────────────────────────────────────────
app.use('/api', apiRoutes);

// Fallback: serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── MONGODB CONNECTION ─────────────────────────────────────
async function startServer() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
    console.log(`   Database: ${mongoose.connection.db.databaseName}`);

    app.listen(PORT, () => {
      console.log(`\n🚀 NidhiNetra server running at http://localhost:${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
      console.log(`\n   Endpoints:`);
      console.log(`   GET /api/cases`);
      console.log(`   GET /api/accounts?caseId=ALL`);
      console.log(`   GET /api/accounts/:id`);
      console.log(`   GET /api/transactions?caseId=ALL`);
      console.log(`   GET /api/transactions/:id`);
      console.log(`   GET /api/stats?caseId=ALL`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

startServer();
