const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  caseId:  { type: String, required: true, unique: true },
  name:    { type: String, required: true },
  type:    { type: String, required: true },
  city:    { type: String, required: true },
  status:  { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Case', caseSchema);
