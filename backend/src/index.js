import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import cookieParser from 'cookie-parser';

// Load environment variables first
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes.js';
import mailRoutes from './routes/mail.routes.js';
import syncRoutes from './routes/sync.routes.js';
import aiRoutes from './routes/ai.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import recategorizeRoutes from './routes/recategorize.routes.js';
import followupRoutes from './routes/followup.routes.js';

// Basic error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * SmartMail Backend Server
 * AI-powered email organizer API
 */

const app = express();
let PORT = Number(process.env.PORT) || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Middleware Setup
 */
// CORS configuration - Allow network access for mobile testing
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://smartmail.example.com'
    : [
        'http://localhost:3000', 
        'http://localhost:5173', 
        'http://localhost:5174',
        'http://192.168.0.102:5173',
        'http://192.168.137.1:5173',
        'http://172.30.176.1:5173'
      ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Cookie parser - MUST be before session
app.use(cookieParser());

// Session middleware - MUST be before routes
app.use(session({
  secret: process.env.SESSION_SECRET || 'smartmail-super-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production', // Only HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SmartMail API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recategorize', recategorizeRoutes);
app.use('/api/followups', followupRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'SmartMail API v1.0.0',
    endpoints: {
      auth: '/api/auth',
      mail: '/api/mail', 
      ai: '/api/ai',
      user: '/api/user',
      chat: '/api/chat'
    },
    documentation: '/api/docs' // TODO: Add API documentation
  });
});

/**
 * Error Handling
 */
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

/**
 * Server Startup
 */
function startServer() {
  console.log('🚀 Starting SmartMail Backend Server...');

  const maxAttempts = 3; // try up to PORT, PORT+1, PORT+2
  let attempt = 0;
  function bind(port) {
    attempt += 1;
    const server = app.listen(port, () => {
      PORT = port;
      process.env.PORT = String(port);
      console.log(`✅ SmartMail Backend Server running on port ${port}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`📍 Health check: http://localhost:${port}/health`);
      console.log(`📚 API base URL: http://localhost:${port}/api`);
      if (NODE_ENV === 'development') {
        console.log('🔧 Development mode - detailed logging enabled');
      }
    });
    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && attempt < maxAttempts) {
        console.warn(`⚠️ Port ${port} in use. Retrying on ${port + 1}...`);
        return bind(port + 1);
      }
      console.error('❌ Failed to start server:', err);
      process.exit(1);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`\n📴 Received ${signal}. Starting graceful shutdown...`);
      server.close((closeErr) => {
        if (closeErr) {
          console.error('❌ Error during server shutdown:', closeErr);
          process.exit(1);
        }
        console.log('🔌 Server closed');
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  }

  return bind(PORT);
}

// Start the server
startServer();

export default app;