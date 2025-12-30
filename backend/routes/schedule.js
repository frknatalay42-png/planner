const express = require('express');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Generate schedule
router.get('/generate', authenticateToken, async (req, res) => {
  try {
    let companyId;
    if (req.user.type === 'company') {
      companyId = req.user.id;
    } else {
      // For employees, get their company
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

    const schedule = generateSchedule(company.employees, company.projects);

    res.json({
      message: 'Schedule generated successfully',
      schedule
    });
  } catch (error) {
    console.error('Generate schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

function generateSchedule(employees, projects) {
  const today = new Date();
  const schedule = [];

  projects.forEach(project => {
    // Get available employees (not on vacation today)
    const availableEmployees = employees.filter(emp => {
      const isOnVacation = emp.vacations?.some(vac => {
        const vacStart = new Date(vac.start);
        const vacEnd = new Date(vac.end);
        return today >= vacStart && today <= vacEnd;
      });
      return !isOnVacation;
    });

    if (availableEmployees.length > 0) {
      // Sort by favorite status and priority
      const sortedEmployees = availableEmployees
        .map(emp => {
          const fav = project.favoriteEmployees.find(f => f.employeeId._id.toString() === emp._id.toString());
          return {
            ...emp.toObject(),
            priority: fav ? fav.priority : 0,
            isFavorite: !!fav
          };
        })
        .sort((a, b) => b.priority - a.priority);

      // Assign top 3 employees to this project
      sortedEmployees.slice(0, 3).forEach((emp, index) => {
        schedule.push({
          project: {
            id: project._id,
            name: project.name
          },
          employee: {
            id: emp._id,
            name: emp.name,
            email: emp.email
          },
          week: index + 1,
          priority: emp.priority,
          isFavorite: emp.isFavorite
        });
      });
    }
  });

  return schedule;
}

module.exports = router;