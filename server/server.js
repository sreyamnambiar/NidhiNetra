const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const neo4jService = require('./services/neo4j');

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

    // Initialize Neo4j in the background (non-blocking)
    setImmediate(async () => {
      console.log('🔌 Initializing Neo4j connection...');
      neo4jService.initDriver();
      
      // Wait a moment for driver to initialize, then seed database
      setTimeout(async () => {
        try {
          await neo4jService.seedDatabase();
          console.log('✅ Neo4j database seeded successfully!');
        } catch (err) {
          console.error('⚠️  Neo4j seeding failed:', err.message);
        }
      }, 1000);
    });

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
      console.log(`\n   Neo4j Pattern Detection:`);
      console.log(`   GET /api/patterns/circular`);
      console.log(`   GET /api/patterns/rapid`);
      console.log(`   GET /api/patterns/high-value`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

startServer();
