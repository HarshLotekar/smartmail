import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * Authentication Middleware
 * Verifies user is logged in via JWT cookie or session
 */

export const authMiddleware = (req, res, next) => {
  console.log('🔐 Auth middleware - Checking authentication');
  
  // Check for JWT in cookies first
  const token = req.cookies?.auth_token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        googleId: decoded.googleId
      };
      console.log('✅ User authenticated via JWT:', req.user);
      return next();
    } catch (error) {
      console.log('❌ JWT verification failed:', error.message);
    }
  }
  
  // Fallback to session check
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      email: req.session.userEmail || null
    };
    console.log('✅ User authenticated via session:', req.user);
    return next();
  }
  
  // Not authenticated
  console.log('❌ Authentication failed - no valid JWT or session');
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Please log in to access this resource'
  });
};

/**
 * Optional auth middleware - doesn't block if not authenticated
 */
export const optionalAuthMiddleware = (req, res, next) => {
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      email: req.session.userEmail || null
    };
  }
  next();
};
