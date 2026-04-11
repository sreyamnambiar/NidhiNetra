const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const neo4jService = require('../services/neo4j');

// ── DEBUG: check first account ─────────────────────────────
router.get('/debug/first-account', async (req, res) => {
  try {
    const mongoAcc = await Account.findOne({});
    const neo4jAccounts = await neo4jService.getAccountsFromNeo4j();
    res.json({
      mongoAccount: mongoAcc ? mongoAcc._doc : null,
      neo4jFirstAccount: neo4jAccounts[0] || null,
      neo4jTotal: neo4jAccounts.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CASES ──────────────────────────────────────────────────
router.get('/cases', async (req, res) => {
  try {
    const cases = await Case.find({});
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ACCOUNTS ───────────────────────────────────────────────
// Get accounts from both MongoDB (mock) and Neo4j (real)
router.get('/accounts', async (req, res) => {
  try {
    const { caseId, source } = req.query;
    let mongoAccounts = [];
    let neo4jAccounts = [];

    // Fetch from MongoDB
    if (!source || source === 'mongo' || source === 'all') {
      let filter = {};
      if (caseId && caseId !== 'ALL') {
        filter.caseId = caseId;
      }
      mongoAccounts = await Account.find(filter);
    }

    // Fetch from Neo4j
    if (!source || source === 'neo4j' || source === 'all') {
      neo4jAccounts = await neo4jService.getAccountsFromNeo4j(caseId);
    }

    // Merge results
    const allAccounts = [
      ...mongoAccounts.map(a => ({ ...a._doc, source: 'mongodb' })),
      ...neo4jAccounts
    ];

    res.json(allAccounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const { source } = req.query;
    let account = null;

    // Try MongoDB first
    if (!source || source === 'mongo' || source === 'all') {
      account = await Account.findOne({ accountId: req.params.id });
      if (account) {
        return res.json({ ...account._doc, source: 'mongodb' });
      }
    }

    // Try Neo4j
    if (!source || source === 'neo4j' || source === 'all') {
      const neo4jRelationships = await neo4jService.getAccountRelationships(req.params.id);
      if (neo4jRelationships) {
        return res.json({
          account: neo4jRelationships.account,
          outgoing: neo4jRelationships.outgoing,
          incoming: neo4jRelationships.incoming,
          source: 'neo4j'
        });
      }
    }

    res.status(404).json({ error: 'Account not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TRANSACTIONS ───────────────────────────────────────────
router.get('/transactions', async (req, res) => {
  try {
    const { caseId } = req.query;
    let filter = {};
    if (caseId && caseId !== 'ALL') {
      if (caseId === 'CROSS') {
        filter.caseId = 'CROSS';
      } else {
        filter.$or = [{ caseId: caseId }, { caseId: 'CROSS' }];
      }
    }
    const transactions = await Transaction.find(filter).sort({ date: 1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions/:id', async (req, res) => {
  try {
    const txn = await Transaction.findOne({ txnId: req.params.id });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    res.json(txn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── STATS ──────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const { caseId } = req.query;
    let accountFilter = {};
    let txnFilter = {};
    if (caseId && caseId !== 'ALL') {
      accountFilter.caseId = caseId;
      txnFilter.$or = [{ caseId: caseId }, { caseId: 'CROSS' }];
    }

    const [accountCount, txnCount, totalVolume] = await Promise.all([
      Account.countDocuments(accountFilter),
      Transaction.countDocuments(txnFilter),
      Transaction.aggregate([
        { $match: txnFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      accounts: accountCount,
      transactions: txnCount,
      totalVolume: totalVolume[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── NEO4J PATTERN DETECTION ────────────────────────────────
// Detect circular transaction patterns (money laundering)
router.get('/patterns/circular', async (req, res) => {
  try {
    const patterns = await neo4jService.getCircularPatterns();
    res.json({
      pattern_type: 'circular-transactions',
      count: patterns.length,
      data: patterns
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detect rapid sequential transactions (structuring)
router.get('/patterns/rapid', async (req, res) => {
  try {
    const patterns = await neo4jService.getRapidTransactions();
    res.json({
      pattern_type: 'rapid-sequential',
      count: patterns.length,
      data: patterns
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detect high-value transaction networks
router.get('/patterns/high-value', async (req, res) => {
  try {
    const { threshold } = req.query;
    const patterns = await neo4jService.getHighValueNetworks(threshold ? parseInt(threshold) : 1000000);
    res.json({
      pattern_type: 'high-value-network',
      count: patterns.length,
      data: patterns
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
