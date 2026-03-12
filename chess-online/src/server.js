/**
 * @fileoverview Main server file for Chess Online application
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Server } from 'socket.io';
import RoomManager from './core/RoomManager.js';
import { validateRoomId, validateMove, validateChatMessage } from './middleware/validation.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { logger } from './utils/logger.js';

/**
 * Application configuration
 */
const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  roomCleanup: {
    interval: 5 * 60 * 1000, // 5 minutes
    maxInactiveMinutes: 30, // 30 minutes
  },
};

/**
 * Initialize Express application
 */
const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Performance middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: config.rateLimit.max,
  duration: config.rateLimit.windowMs / 1000,
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({ error: 'Too many requests' });
  }
});

/**
 * Initialize Socket.IO
 */
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

/**
 * Initialize Room Manager
 */
const roomManager = new RoomManager();

/**
 * Setup Socket.IO handlers
 */
setupSocketHandlers(io, roomManager);

/**
 * REST API Routes
 */

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  const stats = roomManager.getGlobalStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    stats,
  });
});

/**
 * Get room statistics
 */
app.get('/api/rooms/:roomId/stats', validateRoomId, (req, res) => {
  const { roomId } = req.params;
  const stats = roomManager.getRoomStats(roomId);
  
  if (!stats) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json(stats);
});

/**
 * Get global statistics
 */
app.get('/api/stats', (req, res) => {
  const stats = roomManager.getGlobalStats();
  res.json(stats);
});

/**
 * Validate move endpoint (for debugging/testing)
 */
app.post('/api/validate-move', validateMove, (req, res) => {
  // This endpoint just validates the move format
  res.json({ valid: true });
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  if (config.env === 'development') {
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Room cleanup interval
 */
setInterval(() => {
  try {
    const cleanedRooms = roomManager.cleanupInactiveRooms(config.roomCleanup.maxInactiveMinutes);
    if (cleanedRooms.length > 0) {
      logger.info(`Cleaned up ${cleanedRooms.length} inactive rooms: ${cleanedRooms.join(', ')}`);
    }
  } catch (error) {
    logger.error('Error during room cleanup:', error);
  }
}, config.roomCleanup.interval);

/**
 * Graceful shutdown handling
 */
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close Socket.IO
    io.close(() => {
      logger.info('Socket.IO server closed');
      
      // Clean up rooms
      roomManager.clearAllRooms();
      logger.info('All rooms cleared');
      
      process.exit(0);
    });
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Start server
 */
server.listen(config.port, () => {
  logger.info(`Server listening on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Process ID: ${process.pid}`);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
