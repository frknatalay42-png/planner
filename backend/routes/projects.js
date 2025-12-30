const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Company = require('../models/Company');
const { authenticateToken } = require('./auth');
const { isDemoMode, demoData, generateId } = require('../demo');

const router = express.Router();

// Get all projects for company
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isDemoMode()) {
      const projects = Object.values(demoData.projects).filter(p => p.company === req.user.id);
      // Add employee details to favoriteEmployees
      projects.forEach(project => {
        project.favoriteEmployees = project.favoriteEmployees.map(fav => ({
          ...fav,
          employeeId: demoData.employees[fav.employeeId] ? {
            id: demoData.employees[fav.employeeId].id,
            name: demoData.employees[fav.employeeId].name,
            email: demoData.employees[fav.employeeId].email
          } : null
        })).filter(fav => fav.employeeId);
      });
      res.json(projects);
    } else {
      const projects = await Project.find({ company: req.user.id }).populate('favoriteEmployees.employeeId', 'name email');
      res.json(projects);
    }
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new project
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1 }).withMessage('Project name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name } = req.body;

    if (isDemoMode()) {
      // Create project
      const projectId = generateId();
      const project = {
        id: projectId,
        name,
        company: req.user.id,
        favoriteEmployees: []
      };

      demoData.projects[projectId] = project;

      res.status(201).json({
        message: 'Project added successfully',
        project
      });
    } else {
      // Create project
      const project = new Project({
        name,
        company: req.user.id
      });

      await project.save();

      // Add to company's projects array
      await Company.findByIdAndUpdate(req.user.id, {
        $push: { projects: project._id }
      });

      res.status(201).json({
        message: 'Project added successfully',
        project
      });
    }
  } catch (error) {
    console.error('Add project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update project
router.put('/:id', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Project name cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name } = req.body;
    const updateData = {};
    if (name) updateData.name = name;

    if (isDemoMode()) {
      const project = demoData.projects[req.params.id];
      if (!project || project.company !== req.user.id) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (name) project.name = name;

      res.json({
        message: 'Project updated successfully',
        project
      });
    } else {
      const project = await Project.findOneAndUpdate(
        { _id: req.params.id, company: req.user.id },
        updateData,
        { new: true }
      ).populate('favoriteEmployees.employeeId', 'name email');

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({
        message: 'Project updated successfully',
        project
      });
    }
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isDemoMode()) {
      const project = demoData.projects[req.params.id];
      if (!project || project.company !== req.user.id) {
        return res.status(404).json({ error: 'Project not found' });
      }

      delete demoData.projects[req.params.id];

      res.json({ message: 'Project deleted successfully' });
    } else {
      const project = await Project.findOneAndDelete({
        _id: req.params.id,
        company: req.user.id
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Remove from company's projects array
      await Company.findByIdAndUpdate(req.user.id, {
        $pull: { projects: req.params.id }
      });

      res.json({ message: 'Project deleted successfully' });
    }
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add favorite employee to project
router.post('/:id/favorites', authenticateToken, [
  body('employeeId').isMongoId().withMessage('Valid employee ID required'),
  body('priority').optional().isInt({ min: 0, max: 100 }).withMessage('Priority must be between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { employeeId, priority = 50 } = req.body;

    // Check if employee belongs to company
    const company = await Company.findById(req.user.id);
    if (!company.employees.includes(employeeId)) {
      return res.status(400).json({ error: 'Employee does not belong to this company' });
    }

    const project = await Project.findOne({ _id: req.params.id, company: req.user.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if already favorite
    const existing = project.favoriteEmployees.find(fav => fav.employeeId.toString() === employeeId);
    if (existing) {
      return res.status(400).json({ error: 'Employee is already a favorite for this project' });
    }

    project.favoriteEmployees.push({ employeeId, priority });
    await project.save();

    await project.populate('favoriteEmployees.employeeId', 'name email');

    res.json({
      message: 'Favorite employee added successfully',
      project
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update favorite employee priority
router.put('/:id/favorites/:employeeId', authenticateToken, [
  body('priority').isInt({ min: 0, max: 100 }).withMessage('Priority must be between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { priority } = req.body;

    const project = await Project.findOne({ _id: req.params.id, company: req.user.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const favorite = project.favoriteEmployees.find(fav => fav.employeeId.toString() === req.params.employeeId);
    if (!favorite) {
      return res.status(404).json({ error: 'Employee is not a favorite for this project' });
    }

    favorite.priority = priority;
    await project.save();

    await project.populate('favoriteEmployees.employeeId', 'name email');

    res.json({
      message: 'Priority updated successfully',
      project
    });
  } catch (error) {
    console.error('Update priority error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove favorite employee from project
router.delete('/:id/favorites/:employeeId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const project = await Project.findOne({ _id: req.params.id, company: req.user.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.favoriteEmployees = project.favoriteEmployees.filter(
      fav => fav.employeeId.toString() !== req.params.employeeId
    );
    await project.save();

    await project.populate('favoriteEmployees.employeeId', 'name email');

    res.json({
      message: 'Favorite employee removed successfully',
      project
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;