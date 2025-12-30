const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const { authenticateToken } = require('./auth');
const { isDemoMode, demoData, generateId, hashPassword } = require('../demo');

const router = express.Router();

// Get all employees for company
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isDemoMode()) {
      const employees = Object.values(demoData.employees).filter(e => e.company === req.user.id);
      res.json(employees);
    } else {
      const employees = await Employee.find({ company: req.user.id });
      res.json(employees);
    }
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new employee
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, email } = req.body;

    if (isDemoMode()) {
      // Check if employee with this email already exists in company
      const existingEmployee = Object.values(demoData.employees).find(e => e.email === email && e.company === req.user.id);
      if (existingEmployee) {
        return res.status(400).json({ error: 'Employee with this email already exists' });
      }

      // Generate unique referral code and temp password
      let referralCode, tempPassword;
      let attempts = 0;
      do {
        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        tempPassword = Math.random().toString(36).substring(2, 10);
        attempts++;
      } while (Object.values(demoData.employees).some(e => e.referralCode === referralCode) && attempts < 10);

      if (attempts >= 10) {
        return res.status(500).json({ error: 'Could not generate unique codes' });
      }

      // Create employee
      const employeeId = generateId();
      const employee = {
        id: employeeId,
        name,
        email,
        referralCode,
        tempPassword: hashPassword(tempPassword),
        company: req.user.id,
        vacations: []
      };

      demoData.employees[employeeId] = employee;

      res.status(201).json({
        message: 'Employee added successfully',
        employee: {
          id: employeeId,
          name: employee.name,
          email: employee.email,
          referralCode,
          tempPassword // Return plain password for sharing
        }
      });
    } else {
      // Check if employee with this email already exists in company
      const existingEmployee = await Employee.findOne({ email, company: req.user.id });
      if (existingEmployee) {
        return res.status(400).json({ error: 'Employee with this email already exists' });
      }

      // Generate unique referral code and temp password
      let referralCode, tempPassword;
      let attempts = 0;
      do {
        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        tempPassword = Math.random().toString(36).substring(2, 10);
        attempts++;
      } while ((await Employee.findOne({ referralCode })) && attempts < 10);

      if (attempts >= 10) {
        return res.status(500).json({ error: 'Could not generate unique codes' });
      }

      // Hash temp password
      const hashedTempPassword = await bcrypt.hash(tempPassword, 12);

      // Create employee
      const employee = new Employee({
        name,
        email,
        referralCode,
        tempPassword: hashedTempPassword,
        company: req.user.id
      });

      await employee.save();

      // Add to company's employees array
      await Company.findByIdAndUpdate(req.user.id, {
        $push: { employees: employee._id }
      });

      res.status(201).json({
        message: 'Employee added successfully',
        employee: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          referralCode,
          tempPassword // Return plain password for sharing
        }
      });
    }
  } catch (error) {
    console.error('Add employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update employee
router.put('/:id', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, email } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    if (isDemoMode()) {
      const employee = demoData.employees[req.params.id];
      if (!employee || employee.company !== req.user.id) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      if (name) employee.name = name;
      if (email) employee.email = email;

      res.json({
        message: 'Employee updated successfully',
        employee
      });
    } else {
      const employee = await Employee.findOneAndUpdate(
        { _id: req.params.id, company: req.user.id },
        updateData,
        { new: true }
      );

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json({
        message: 'Employee updated successfully',
        employee
      });
    }
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete employee
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isDemoMode()) {
      const employee = demoData.employees[req.params.id];
      if (!employee || employee.company !== req.user.id) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      delete demoData.employees[req.params.id];

      res.json({ message: 'Employee deleted successfully' });
    } else {
      const employee = await Employee.findOneAndDelete({
        _id: req.params.id,
        company: req.user.id
      });

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Remove from company's employees array
      await Company.findByIdAndUpdate(req.user.id, {
        $pull: { employees: req.params.id }
      });

      res.json({ message: 'Employee deleted successfully' });
    }
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add vacation (for employees)
router.post('/:id/vacations', authenticateToken, [
  body('start').isISO8601().withMessage('Valid start date required'),
  body('end').isISO8601().withMessage('Valid end date required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { start, end } = req.body;

    if (new Date(start) > new Date(end)) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    if (isDemoMode()) {
      // Check if user is company admin or the employee themselves
      let employee;
      if (req.user.type === 'company') {
        employee = demoData.employees[req.params.id];
        if (!employee || employee.company !== req.user.id) {
          return res.status(404).json({ error: 'Employee not found' });
        }
      } else {
        employee = demoData.employees[req.user.id];
        if (!employee || employee.id !== req.params.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      employee.vacations.push({ 
        id: generateId(),
        start: new Date(start), 
        end: new Date(end) 
      });

      res.status(201).json({
        message: 'Vacation added successfully',
        vacations: employee.vacations
      });
    } else {
      // Check if user is company admin or the employee themselves
      let employee;
      if (req.user.type === 'company') {
        employee = await Employee.findOne({ _id: req.params.id, company: req.user.id });
      } else {
        employee = await Employee.findById(req.user.id);
        if (employee._id.toString() !== req.params.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      employee.vacations.push({ start: new Date(start), end: new Date(end) });
      await employee.save();

      res.status(201).json({
        message: 'Vacation added successfully',
        vacations: employee.vacations
      });
    }
  } catch (error) {
    console.error('Add vacation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get employee vacations
router.get('/:id/vacations', authenticateToken, async (req, res) => {
  try {
    if (isDemoMode()) {
      let employee;
      if (req.user.type === 'company') {
        employee = demoData.employees[req.params.id];
        if (!employee || employee.company !== req.user.id) {
          return res.status(404).json({ error: 'Employee not found' });
        }
      } else {
        employee = demoData.employees[req.user.id];
        if (!employee || employee.id !== req.params.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      res.json(employee.vacations);
    } else {
      let employee;
      if (req.user.type === 'company') {
        employee = await Employee.findOne({ _id: req.params.id, company: req.user.id });
      } else {
        employee = await Employee.findById(req.user.id);
        if (employee._id.toString() !== req.params.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json(employee.vacations);
    }
  } catch (error) {
    console.error('Get vacations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete vacation
router.delete('/:id/vacations/:vacationId', authenticateToken, async (req, res) => {
  try {
    if (isDemoMode()) {
      let employee;
      if (req.user.type === 'company') {
        employee = demoData.employees[req.params.id];
        if (!employee || employee.company !== req.user.id) {
          return res.status(404).json({ error: 'Employee not found' });
        }
      } else {
        employee = demoData.employees[req.user.id];
        if (!employee || employee.id !== req.params.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      employee.vacations = employee.vacations.filter(vac => vac.id !== req.params.vacationId);

      res.json({ message: 'Vacation deleted successfully' });
    } else {
      let employee;
      if (req.user.type === 'company') {
        employee = await Employee.findOne({ _id: req.params.id, company: req.user.id });
      } else {
        employee = await Employee.findById(req.user.id);
        if (employee._id.toString() !== req.params.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      employee.vacations = employee.vacations.filter(vac => vac._id.toString() !== req.params.vacationId);
      await employee.save();

      res.json({ message: 'Vacation deleted successfully' });
    }
  } catch (error) {
    console.error('Delete vacation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;