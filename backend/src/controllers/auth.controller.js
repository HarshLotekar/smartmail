import * as gmailConfig from '../config/gmail.js';
import * as userModel from '../models/user.model.js';
import jwt from 'jsonwebtoken';

/**
 * Authentication Controller
 * Handles Google OAuth flow and user authentication
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Initiate Google OAuth authentication
 * GET /api/auth/google
 */
async function initiateAuth(req, res) {
  try {
    console.log('🔧 Debug - initiateAuth called');
    console.log('🔧 Environment check:');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
    
    const authUrl = gmailConfig.getAuthUrl();
    // Redirect the browser directly to Google OAuth consent screen
    return res.redirect(authUrl);
  } catch (error) {
    console.error('❌ Full error in initiateAuth:', error);
    console.error('❌ Error initiating auth:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate authentication',
      message: error.message
    });
  }
}

/**
 * Handle Google OAuth callback
 * GET /api/auth/callback?code=...
 */
async function handleCallback(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    // Exchange code for tokens
    const tokens = await gmailConfig.getTokensFromCode(code);
    
    console.log('🔑 Tokens received from Google:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in
    });
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    // Get user profile information
    const profile = await gmailConfig.getUserProfile(tokens.access_token);
    
    console.log('👤 User profile:', {
      id: profile.id,
      email: profile.email,
      name: profile.name
    });

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    // Check if user exists
    let user = await userModel.findUserByGoogleId(profile.id);

    if (user) {
      console.log('📝 Updating existing user:', user.id);
      // Update existing user tokens
      await userModel.updateUserTokens(
        user.id,
        tokens.access_token,
        tokens.refresh_token,
        expiresAt
      );
      
      // Update profile info if changed
      if (user.name !== profile.name || user.avatar_url !== profile.picture) {
        await userModel.updateUserProfile(user.id, {
          name: profile.name,
          avatarUrl: profile.picture
        });
      }

      user = await userModel.findUserById(user.id);
      console.log('✅ User updated, has tokens:', {
        hasAccessToken: !!user.access_token,
        hasRefreshToken: !!user.refresh_token
      });
    } else {
      console.log('➕ Creating new user');
      // Create new user
      user = await userModel.createUser({
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt
      });
      console.log('✅ User created:', user.id);
    }

    // Generate JWT token (NO cookies, NO sessions)
    const jwtToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        googleId: user.google_id 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Redirect to frontend /auth/success with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/success?token=${jwtToken}`;
    
    console.log('✅ OAuth success, redirecting to:', redirectUrl);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Error in OAuth callback:', error.message);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
}

/**
 * Refresh user tokens
 * POST /api/auth/refresh
 */
async function refreshToken(req, res) {
  try {
    const userId = req.user.userId;
    const user = await userModel.findUserById(userId);

    if (!user || !user.refresh_token) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token available'
      });
    }

    // Refresh tokens with Google
    const newTokens = await gmailConfig.refreshAccessToken(user.refresh_token);
    
    // Calculate new expiration
    const expiresAt = new Date(Date.now() + (newTokens.expires_in || 3600) * 1000);

    // Update user tokens in database
    await userModel.updateUserTokens(
      userId,
      newTokens.access_token,
      newTokens.refresh_token || user.refresh_token,
      expiresAt
    );

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      expiresAt
    });

  } catch (error) {
    console.error('❌ Error refreshing token:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      message: error.message
    });
  }
}

/**
 * Get user profile
 * GET /api/auth/profile
 */
async function getProfile(req, res) {
  try {
    const userId = req.user.userId;
    const user = await userModel.findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        preferences: JSON.parse(user.preferences || '{}'),
        created_at: user.created_at,
        token_valid: userModel.isTokenValid(user)
      }
    });

  } catch (error) {
    console.error('❌ Error getting profile:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      message: error.message
    });
  }
}

/**
 * Update user preferences
 * PUT /api/auth/preferences
 */
async function updatePreferences(req, res) {
  try {
    const userId = req.user.userId;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid preferences object is required'
      });
    }

    await userModel.updateUserPreferences(userId, preferences);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences
    });

  } catch (error) {
    console.error('❌ Error updating preferences:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: error.message
    });
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    // Clear the authentication cookie
    res.clearCookie('auth_token');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ Error during logout:', error.message);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
}

/**
 * Delete user account
 * DELETE /api/auth/account
 */
async function deleteAccount(req, res) {
  try {
    const userId = req.user.userId;
    
    // Delete user and all related data
    await userModel.deleteUser(userId);

    // Clear the authentication cookie
    res.clearCookie('auth_token');

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting account:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      message: error.message
    });
  }
}

/**
 * Check authentication status
 * GET /api/auth/check
 */
async function checkAuth(req, res) {
  try {
    const userId = req.user.userId;
    const user = await userModel.findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url
      },
      token_valid: userModel.isTokenValid(user)
    });

  } catch (error) {
    console.error('❌ Error checking auth:', error.message);
    res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Authentication check failed'
    });
  }
}

export {
  initiateAuth,
  handleCallback,
  refreshToken,
  getProfile,
  updatePreferences,
  logout,
  deleteAccount,
  checkAuth
};