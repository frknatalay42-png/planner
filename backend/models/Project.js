const mongoose = require('mongoose');

const favoriteEmployeeSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  priority: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  }
});

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  favoriteEmployees: [favoriteEmployeeSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);