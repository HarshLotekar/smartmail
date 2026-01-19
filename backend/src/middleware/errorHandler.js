// backend/src/middleware/errorHandler.js
// Centralized error handler for Express, including JWT errors

export default function errorHandler(err, req, res, next) {
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  // Other errors
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
}/**
 * Global error handling middleware for Express
 */

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle async errors by wrapping async route handlers
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle different types of errors
 */
const handleDatabaseError = (error) => {
  let message = 'Database operation failed';
  let statusCode = 500;

  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    message = 'Duplicate entry. Resource already exists.';
    statusCode = 409;
  } else if (error.code === 'SQLITE_CONSTRAINT_FOREIGN_KEY') {
    message = 'Invalid reference. Related resource not found.';
    statusCode = 400;
  } else if (error.code === 'SQLITE_CONSTRAINT_NOT_NULL') {
    message = 'Required field is missing.';
    statusCode = 400;
  }

  return new AppError(message, statusCode);
};

const handleJWTError = () => {
  return new AppError('Invalid authentication token', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Authentication token has expired', 401);
};

const handleValidationError = (error) => {
  const message = Object.values(error.details || {}).map(val => val.message).join('. ');
  return new AppError(`Validation error: ${message}`, 400);
};

const handleGoogleAPIError = (error) => {
  let message = 'Google API error';
  let statusCode = 500;

  if (error.code === 401) {
    message = 'Google authentication failed. Please re-authenticate.';
    statusCode = 401;
  } else if (error.code === 403) {
    message = 'Google API access denied. Check permissions.';
    statusCode = 403;
  } else if (error.code === 429) {
    message = 'Google API rate limit exceeded. Please try again later.';
    statusCode = 429;
  }

  return new AppError(message, statusCode);
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
      error = handleDatabaseError(error);
    } else if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    } else if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    } else if (err.name === 'ValidationError') {
      error = handleValidationError(error);
    } else if (err.name === 'GaxiosError' || err.message?.includes('Google')) {
      error = handleGoogleAPIError(error);
    }

    sendErrorProd(error, res);
  }
};

/**
 * Handle unhandled routes
 */
export const notFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

/**
 * Log request information
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    console.log(
      `${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`
    );
  });

  next();
};

/**
 * Validate request body against schema
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(`Validation error: ${errorMessage}`, 400));
    }
    
    req.body = value; // Use validated/sanitized data
    next();
  };
};

/**
 * Validate query parameters against schema
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(`Query validation error: ${errorMessage}`, 400));
    }
    
    req.query = value; // Use validated/sanitized data
    next();
  };
};

/**
 * Handle process-level errors
 */
export const setupGlobalErrorHandlers = () => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  });

  // Handle SIGTERM
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    process.exit(0);
  });
};