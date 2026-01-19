import express from 'express';
import * as userController from '../controllers/user.controller.js';

// Import JWT authentication middleware
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * User Routes  
 * Base path: /api/user
 */


// Protected route: GET /api/user/me returns authenticated user
router.get('/me', authenticateToken, (req, res) => {
	res.json({ user: req.user });
});

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/preferences', userController.updatePreferences);

// Label management routes
router.get('/labels', userController.getLabels);
router.post('/labels', userController.createLabel);
router.put('/labels/:labelId', userController.updateLabel);
router.delete('/labels/:labelId', userController.deleteLabel);
router.get('/labels/search', userController.searchLabels);
router.get('/labels/stats', userController.getLabelStats);
router.post('/labels/initialize', userController.initializeLabels);

// Dashboard route
router.get('/dashboard', userController.getDashboard);

export default router;