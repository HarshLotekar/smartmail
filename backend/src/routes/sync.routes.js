import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  incrementalSync, 
  getSyncStatus,
  clearRateLimitManually
} from '../controllers/sync.controller.js';

const router = express.Router();

/**
 * Sync Routes
 * Base path: /api/sync
 * 
 * QUOTA-SAFE SYNC SYSTEM:
 * - Uses Gmail History API for incremental updates
 * - Fetches message IDs only (full details loaded on-demand)
 * - Enforces rate limit cooldowns
 * - Never auto-syncs on page load
 */

// Get current sync status (rate limit, last sync time)
router.get('/status', authenticateToken, getSyncStatus);

// Trigger incremental sync (manual only - user clicks button)
router.post('/incremental', authenticateToken, incrementalSync);

// Clear rate limit (debug/admin)
router.post('/clear-rate-limit', authenticateToken, clearRateLimitManually);

export default router;
