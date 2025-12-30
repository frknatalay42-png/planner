const express = require('express');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const { authenticateToken } = require('./auth');
const { isDemoMode, demoData } = require('../demo');
const generateSchedule = require('../scheduler/generateSchedule');

const router = express.Router();

// Generate schedule
router.get('/generate', authenticateToken, async (req, res) => {
  try {
    if (isDemoMode()) {
      let companyId;
      if (req.user.type === 'company') {
        companyId = req.user.id;
      } else {
        const employee = demoData.employees[req.user.id];
        companyId = employee.company;
      }

      const company = demoData.companies[companyId];
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const employees = Object.values(demoData.employees).filter(e => e.company === companyId);
      const projects = Object.values(demoData.projects).filter(p => p.company === companyId);

      if (!employees.length || !projects.length) {
        return res.status(400).json({ error: 'Add employees and projects first' });
      }

      const schedule = generateSchedule(employees, projects, company.settings);

      res.json({
        message: 'Schedule generated successfully',
        schedule
      });
    } else {
      let companyId;
      if (req.user.type === 'company') {
        companyId = req.user.id;
      } else {
        const employee = await Employee.findById(req.user.id);
        companyId = employee.company;
      }

      const company = await Company.findById(companyId)
        .populate('employees')
        .populate({
          path: 'projects',
          populate: {
            path: 'favoriteEmployees.employeeId',
            select: 'name email vacations'
          }
        });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      if (!company.employees.length || !company.projects.length) {
        return res.status(400).json({ error: 'Add employees and projects first' });
      }

      const schedule = generateSchedule(company.employees, company.projects, company.settings);

      res.json({
        message: 'Schedule generated successfully',
        schedule
      });
    }
  } catch (error) {
    console.error('Generate schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;