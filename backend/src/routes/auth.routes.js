import express from 'express';

// Import controller functions
import { initiateAuth, handleCallback } from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// Status endpoint: report readiness of Google OAuth config
router.get('/status', (req, res) => {
  const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  const port = process.env.PORT || 3001;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/auth/callback`;

  res.json({
    success: true,
    message: hasClientId && hasClientSecret
      ? 'Google OAuth configured'
      : 'Google OAuth missing configuration',
    google: {
      clientId: hasClientId,
      clientSecret: hasClientSecret,
      redirectUri
    },
    routes: ['GET /status', 'GET /google', 'GET /callback']
  });
});

// Start Google OAuth flow
router.get('/google', initiateAuth);


// OAuth callback handler: responds with { user, token }
router.get('/callback', handleCallback);

export default router;