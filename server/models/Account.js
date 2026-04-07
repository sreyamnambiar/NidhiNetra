const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountId: { type: String, required: true, unique: true },
  holder:    { type: String, required: true },
  bank:      { type: String, required: true },
  ifsc:      { type: String, required: true },
  accNo:     { type: String, required: true },
  phone:     { type: String },
  email:     { type: String },
  ip:        { type: String },
  city:      { type: String },
  caseId:    { type: String, required: true },
  type:      { type: String, enum: ['source', 'mule', 'destination'], required: true },
  risk:      { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
