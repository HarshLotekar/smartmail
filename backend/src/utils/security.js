import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Security utilities for the SmartMail backend
 */

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate cryptographically secure random string
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate UUID v4
 */
export function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text, key = process.env.ENCRYPTION_KEY) {
  if (!key) {
    throw new Error('Encryption key is required');
  }
  
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
  if (!key) {
    throw new Error('Encryption key is required');
  }
  
  const algorithm = 'aes-256-gcm';
  const decipher = crypto.createDecipher(algorithm, key);
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate string length
 */
export function isValidLength(str, min = 0, max = Infinity) {
  if (typeof str !== 'string') return false;
  return str.length >= min && str.length <= max;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  /**
   * Check if request is within rate limit
   */
  isAllowed(identifier, maxRequests = 100, windowMs = 900000) { // 15 minutes default
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this identifier
    let requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    requests = requests.filter(time => time > windowStart);
    
    // Check if under limit
    if (requests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    requests.push(now);
    this.requests.set(identifier, requests);
    
    return true;
  }

  /**
   * Clear old entries to prevent memory leaks
   */
  cleanup(maxAge = 3600000) { // 1 hour default
    const cutoff = Date.now() - maxAge;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > cutoff);
      
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

/**
 * Content Security Policy headers
 */
export const CSP_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ")
};

/**
 * Security headers middleware configuration
 */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": [
    "geolocation=()",
    "microphone=()",
    "camera=()",
    "payment=()"
  ].join(", "),
  ...CSP_HEADERS
};

/**
 * Validate JWT payload structure
 */
export function validateJWTPayload(payload) {
  return (
    payload &&
    typeof payload === 'object' &&
    typeof payload.userId === 'string' &&
    typeof payload.iat === 'number'
  );
}

/**
 * Hash sensitive data for logging (one-way)
 */
export function hashForLogging(data) {
  return crypto.createHash('sha256').update(String(data)).digest('hex').substring(0, 8);
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken() {
  return generateSecureToken(32);
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token, expectedToken) {
  if (!token || !expectedToken) return false;
  
  // Use timing-safe comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(token, 'utf8');
  const expectedBuffer = Buffer.from(expectedToken, 'utf8');
  
  if (tokenBuffer.length !== expectedBuffer.length) return false;
  
  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(obj, sensitiveFields = ['password', 'token', 'secret', 'key']) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = { ...obj };
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '*'.repeat(8);
    }
  }
  
  return masked;
}

/**
 * Validate OAuth state parameter
 */
export function validateOAuthState(state, expectedState) {
  if (!state || !expectedState) return false;
  
  try {
    const stateBuffer = Buffer.from(state, 'utf8');
    const expectedBuffer = Buffer.from(expectedState, 'utf8');
    
    if (stateBuffer.length !== expectedBuffer.length) return false;
    
    return crypto.timingSafeEqual(stateBuffer, expectedBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Generate secure OAuth state parameter
 */
export function generateOAuthState() {
  return generateSecureToken(16);
}

/**
 * Input validation schema helpers
 */
export const ValidationRules = {
  email: {
    required: true,
    type: 'string',
    format: 'email',
    maxLength: 254
  },
  
  password: {
    required: true,
    type: 'string',
    minLength: 8,
    maxLength: 128
  },
  
  messageId: {
    required: true,
    type: 'string',
    pattern: /^[a-zA-Z0-9_-]+$/,
    maxLength: 50
  },
  
  labelId: {
    required: true,
    type: 'string',
    maxLength: 100
  },
  
  searchQuery: {
    type: 'string',
    maxLength: 500
  },
  
  limit: {
    type: 'number',
    minimum: 1,
    maximum: 100,
    default: 50
  },
  
  offset: {
    type: 'number',
    minimum: 0,
    default: 0
  }
};

/**
 * Sanitize database query parameters
 */
export function sanitizeQueryParams(params, allowedFields) {
  const sanitized = {};
  
  for (const field of allowedFields) {
    if (params[field] !== undefined) {
      sanitized[field] = params[field];
    }
  }
  
  return sanitized;
}

// Create global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// Cleanup rate limiter every hour
setInterval(() => {
  globalRateLimiter.cleanup();
}, 3600000);