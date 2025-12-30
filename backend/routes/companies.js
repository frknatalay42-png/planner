const express = require('express');
const { body, validationResult } = require('express-validator');
const Company = require('../models/Company');
const { authenticateToken } = require('./auth');
const { isDemoMode, demoData } = require('../demo');

const router = express.Router();

// Get company data (for admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isDemoMode()) {
      const company = demoData.companies[req.user.id];
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const employees = Object.values(demoData.employees).filter(e => e.company === req.user.id);
      const projects = Object.values(demoData.projects).filter(p => p.company === req.user.id);

      res.json({
        id: company.id,
        code: company.code,
        name: company.name,
        email: company.email,
        employees: employees,
        projects: projects,
        settings: company.settings
      });
    } else {
      const company = await Company.findById(req.user.id)
        .populate('employees')
        .populate('projects');

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      res.json({
        id: company._id,
        code: company.code,
        name: company.name,
        email: company.email,
        employees: company.employees,
        projects: company.projects,
        settings: company.settings
      });
    }
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update company settings
router.put('/settings', authenticateToken, [
  body('maxHours').isInt({ min: 1, max: 168 }).withMessage('Max hours must be between 1 and 168'),
  body('minRest').isInt({ min: 0, max: 48 }).withMessage('Min rest must be between 0 and 48')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { maxHours, minRest } = req.body;

    if (isDemoMode()) {
      const company = demoData.companies[req.user.id];
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      company.settings = { maxHours, minRest };

      res.json({
        message: 'Settings updated successfully',
        settings: company.settings
      });
    } else {
      const company = await Company.findByIdAndUpdate(
        req.user.id,
        { settings: { maxHours, minRest } },
        { new: true }
      );

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      res.json({
        message: 'Settings updated successfully',
        settings: company.settings
      });
    }
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;