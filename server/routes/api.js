const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

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
router.get('/accounts', async (req, res) => {
  try {
    const { caseId } = req.query;
    let filter = {};
    if (caseId && caseId !== 'ALL') {
      filter.caseId = caseId;
    }
    const accounts = await Account.find(filter);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const account = await Account.findOne({ accountId: req.params.id });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
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

module.exports = router;
