const mongoose = require('mongoose');

const vacationSchema = new mongoose.Schema({
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  }
}, { _id: true });

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  referralCode: {
    type: String,
    required: true,
    unique: true
  },
  tempPassword: {
    type: String,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  vacations: [vacationSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', employeeSchema);