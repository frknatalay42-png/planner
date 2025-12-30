const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { isDemoMode, generateId, hashPassword, comparePassword, generateToken, demoData } = require('../demo');

const router = express.Router();

// Generate JWT token
const generateTokenWrapper = (payload) => {
  return generateToken(payload);
};

// Register company
router.post('/register', [
  body('name').trim().isLength({ min: 1 }).withMessage('Company name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    if (isDemoMode()) {
      // Check if company already exists
      const existingCompany = Object.values(demoData.companies).find(c => c.email === email);
      if (existingCompany) {
        return res.status(400).json({ error: 'Company with this email already exists' });
      }

      // Generate unique company code
      let companyCode;
      let attempts = 0;
      do {
        companyCode = name.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        attempts++;
      } while (Object.values(demoData.companies).some(c => c.code === companyCode) && attempts < 10);

      if (attempts >= 10) {
        return res.status(500).json({ error: 'Could not generate unique company code' });
      }

      // Create company
      const companyId = generateId();
      const company = {
        id: companyId,
        code: companyCode,
        name,
        email,
        password: hashPassword(password),
        adminEmail: email,
        employees: [],
        projects: [],
        settings: { maxHours: 40, minRest: 12 }
      };

      demoData.companies[companyId] = company;

      // Generate token
      const token = generateTokenWrapper({ id: companyId, type: 'company' });

      res.status(201).json({
        message: 'Company registered successfully',
        companyCode,
        token,
        company: {
          id: companyId,
          code: company.code,
          name: company.name,
          email: company.email
        }
      });
    } else {
      // MongoDB mode - existing code
      const Company = require('../models/Company');
      const existingCompany = await Company.findOne({ email });
      if (existingCompany) {
        return res.status(400).json({ error: 'Company with this email already exists' });
      }

      let companyCode;
      let attempts = 0;
      do {
        companyCode = name.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        attempts++;
      } while (await Company.findOne({ code: companyCode }) && attempts < 10);

      if (attempts >= 10) {
        return res.status(500).json({ error: 'Could not generate unique company code' });
      }

      const hashedPassword = hashPassword(password);

      const company = new Company({
        code: companyCode,
        name,
        email,
        password: hashedPassword,
        adminEmail: email
      });

      await company.save();
      const token = generateTokenWrapper({ id: company._id, type: 'company' });

      res.status(201).json({
        message: 'Company registered successfully',
        companyCode,
        token,
        company: {
          id: company._id,
          code: company.code,
          name: company.name,
          email: company.email
        }
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
  body('loginType').isIn(['company', 'employee']).withMessage('Invalid login type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, loginType } = req.body;

    if (isDemoMode()) {
      if (loginType === 'company') {
        // Company login
        const company = Object.values(demoData.companies).find(c => c.code === username.toUpperCase());
        if (!company) {
          return res.status(401).json({ error: 'Invalid company code or password' });
        }

        const isValidPassword = comparePassword(password, company.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid company code or password' });
        }

        const token = generateTokenWrapper({ id: company.id, type: 'company' });

        res.json({
          token,
          user: {
            id: company.id,
            type: 'company',
            code: company.code,
            name: company.name,
            email: company.email
          }
        });
      } else {
        // Employee login
        const employee = Object.values(demoData.employees).find(e => 
          e.referralCode === username && comparePassword(password, e.tempPassword)
        );
        if (!employee) {
          return res.status(401).json({ error: 'Invalid employee code or password' });
        }

        const company = demoData.companies[employee.company];
        const token = generateTokenWrapper({ id: employee.id, type: 'employee' });

        res.json({
          token,
          user: {
            id: employee.id,
            type: 'employee',
            name: employee.name,
            email: employee.email,
            companyId: employee.company,
            companyCode: company.code
          }
        });
      }
    } else {
      // MongoDB mode - existing code
      const Company = require('../models/Company');
      const Employee = require('../models/Employee');

      if (loginType === 'company') {
        const company = await Company.findOne({ code: username.toUpperCase() });
        if (!company) {
          return res.status(401).json({ error: 'Invalid company code or password' });
        }

        const isValidPassword = await bcrypt.compare(password, company.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid company code or password' });
        }

        const token = generateTokenWrapper({ id: company._id, type: 'company' });

        res.json({
          token,
          user: {
            id: company._id,
            type: 'company',
            code: company.code,
            name: company.name,
            email: company.email
          }
        });
      } else {
        const employee = await Employee.findOne({ referralCode: username }).populate('company');
        if (!employee) {
          return res.status(401).json({ error: 'Invalid employee code or password' });
        }

        const isValidPassword = await bcrypt.compare(password, employee.tempPassword);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid employee code or password' });
        }

        const token = generateTokenWrapper({ id: employee._id, type: 'employee' });

        res.json({
          token,
          user: {
            id: employee._id,
            type: 'employee',
            name: employee.name,
            email: employee.email,
            companyId: employee.company._id,
            companyCode: employee.company.code
          }
        });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'demo-secret', (err, user) => {
      if (err) {
        console.log('JWT verification error:', err);
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Get current user
router.get('/me', (req, res) => {
  console.log('Me endpoint called');
  res.json({ message: 'Test endpoint' });
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;