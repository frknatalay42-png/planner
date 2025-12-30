const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  settings: {
    maxHours: {
      type: Number,
      default: 40
    },
    minRest: {
      type: Number,
      default: 12
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);