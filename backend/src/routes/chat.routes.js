import express from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all chat routes
router.use(authMiddleware);

/**
 * POST /api/chat
 * Send a message to the chatbot
 */
router.post('/', chatController.sendMessage);

/**
 * POST /api/chat/action
 * Execute a suggested action
 */
router.post('/action', chatController.executeAction);

/**
 * GET /api/chat/help
 * Get chatbot capabilities and help information
 */
router.get('/help', chatController.getChatHelp);

export default router;
