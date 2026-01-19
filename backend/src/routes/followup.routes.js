import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  detectFollowUp,
  getFollowUps,
  getFollowUp,
  completeFollowUp,
  snoozeFollowUp,
  dismissFollowUp,
  deleteFollowUp,
  getFollowUpStats
} from '../controllers/followup.controller.js';

const router = express.Router();

/**
 * Follow-up Reminder Routes
 * Base path: /api/followups
 */

// Detect if email needs follow-up (AI-powered)
router.post('/detect', authenticateToken, detectFollowUp);

// Get all follow-ups
router.get('/', authenticateToken, getFollowUps);

// Get statistics
router.get('/stats', authenticateToken, getFollowUpStats);

// Get single follow-up
router.get('/:id', authenticateToken, getFollowUp);

// Mark as completed
router.put('/:id/complete', authenticateToken, completeFollowUp);

// Snooze reminder
router.put('/:id/snooze', authenticateToken, snoozeFollowUp);

// Dismiss reminder
router.put('/:id/dismiss', authenticateToken, dismissFollowUp);

// Delete follow-up
router.delete('/:id', authenticateToken, deleteFollowUp);

export default router;
