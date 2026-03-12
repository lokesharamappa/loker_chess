/**
 * @fileoverview Logging utility for the Chess Online application
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

/**
 * Simple logger implementation
 * In production, this could be replaced with Winston or similar
 */
class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'info';
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
  }

  /**
   * Check if a log level should be printed
   * @param {string} level - The log level
   * @returns {boolean} Whether to log
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   * @returns {string} Formatted message
   */
  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    return `${prefix} ${message} ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')}`;
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {...any} args - Additional arguments
   */
  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {...any} args - Additional arguments
   */
  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {...any} args - Additional arguments
   */
  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, ...args));
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {...any} args - Additional arguments
   */
  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, ...args));
    }
  }

  /**
   * Log HTTP request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} responseTime - Response time in milliseconds
   */
  logRequest(req, res, responseTime) {
    const message = `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;
    this.info(message, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
    });
  }

  /**
   * Log Socket.IO event
   * @param {string} event - Event name
   * @param {Object} socket - Socket object
   * @param {Object} data - Event data
   */
  logSocketEvent(event, socket, data) {
    const message = `Socket event: ${event}`;
    this.debug(message, {
      socketId: socket.id,
      roomId: socket.roomId,
      playerCount: Object.keys(socket.rooms).length - 1, // Exclude default room
    });
  }

  /**
   * Log game event
   * @param {string} event - Game event type
   * @param {string} roomId - Room ID
   * @param {Object} data - Game data
   */
  logGameEvent(event, roomId, data) {
    const message = `Game event: ${event}`;
    this.info(message, {
      roomId,
      event,
      data,
    });
  }

  /**
   * Log performance metric
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {Object} tags - Additional tags
   */
  logPerformance(metric, value, tags = {}) {
    const message = `Performance: ${metric} = ${value}ms`;
    this.info(message, tags);
  }

  /**
   * Log security event
   * @param {string} event - Security event type
   * @param {Object} data - Security data
   */
  logSecurity(event, data) {
    const message = `Security event: ${event}`;
    this.warn(message, data);
  }

  /**
   * Create child logger with additional context
   * @param {Object} context - Additional context
   * @returns {Object} Child logger
   */
  child(context) {
    return {
      error: (message, ...args) => this.error(message, context, ...args),
      warn: (message, ...args) => this.warn(message, context, ...args),
      info: (message, ...args) => this.info(message, context, ...args),
      debug: (message, ...args) => this.debug(message, context, ...args),
    };
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
