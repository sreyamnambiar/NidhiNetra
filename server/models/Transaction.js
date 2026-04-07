const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  txnId:    { type: String, required: true, unique: true },
  from:     { type: String, required: true },
  to:       { type: String, required: true },
  amount:   { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  date:     { type: Date, required: true },
  method:   { type: String, required: true },
  note:     { type: String },
  caseId:   { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
