/**
 * @fileoverview Validation middleware for API endpoints
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import Joi from 'joi';

/**
 * Validation schemas
 */
const schemas = {
  roomId: Joi.string().alphanum().min(3).max(50).required(),
  move: Joi.object({
    from: Joi.string().pattern(/^[a-h][1-8]$/).required(),
    to: Joi.string().pattern(/^[a-h][1-8]$/).required(),
    promotion: Joi.string().valid('q', 'r', 'b', 'n').optional(),
  }).required(),
  chatMessage: Joi.string().min(1).max(300).required(),
  playerColor: Joi.string().valid('w', 'b', 'spectator').required(),
};

/**
 * Middleware to validate room ID
 */
export const validateRoomId = (req, res, next) => {
  const { error } = schemas.roomId.validate(req.params.roomId);
  
  if (error) {
    return res.status(400).json({
      error: 'Invalid room ID',
      details: error.details[0].message,
    });
  }
  
  next();
};

/**
 * Middleware to validate move object
 */
export const validateMove = (req, res, next) => {
  const { error } = schemas.move.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Invalid move format',
      details: error.details[0].message,
    });
  }
  
  next();
};

/**
 * Middleware to validate chat message
 */
export const validateChatMessage = (req, res, next) => {
  const { error } = schemas.chatMessage.validate(req.body.message);
  
  if (error) {
    return res.status(400).json({
      error: 'Invalid chat message',
      details: error.details[0].message,
    });
  }
  
  next();
};

/**
 * Middleware to validate player color
 */
export const validatePlayerColor = (req, res, next) => {
  const { error } = schemas.playerColor.validate(req.body.color);
  
  if (error) {
    return res.status(400).json({
      error: 'Invalid player color',
      details: error.details[0].message,
    });
  }
  
  next();
};

/**
 * Generic validation middleware
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[source]);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message),
      });
    }
    
    next();
  };
};

/**
 * Sanitization helpers
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
};

/**
 * Chess-specific validation helpers
 */
export const isValidSquare = (square) => {
  return /^[a-h][1-8]$/.test(square);
};

export const isValidPiece = (piece) => {
  return /^[pnbrqkPNBRQK]$/.test(piece);
};

export const isValidFen = (fen) => {
  // Basic FEN validation
  const fenParts = fen.split(' ');
  if (fenParts.length !== 6) return false;
  
  const [board, turn, castling, enPassant, halfMove, fullMove] = fenParts;
  
  // Validate board
  const boardRows = board.split('/');
  if (boardRows.length !== 8) return false;
  
  for (const row of boardRows) {
    let fileCount = 0;
    for (const char of row) {
      if (/[1-8]/.test(char)) {
        fileCount += parseInt(char, 10);
      } else if (/[pnbrqkPNBRQK]/.test(char)) {
        fileCount += 1;
      } else {
        return false;
      }
    }
    if (fileCount !== 8) return false;
  }
  
  // Validate turn
  if (!/^[wb]$/.test(turn)) return false;
  
  // Validate castling
  if (!/^[KQkq-]+$/.test(castling)) return false;
  
  // Validate en passant
  if (!/^(-|[a-h][36])$/.test(enPassant)) return false;
  
  // Validate move counters
  if (!/^\d+$/.test(halfMove) || !/^\d+$/.test(fullMove)) return false;
  
  return true;
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = (maxRequests, windowMs) => {
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // This would typically connect to a rate limiter service
    // For now, we'll just pass through
    req.rateLimit = {
      clientIp,
      maxRequests,
      windowMs,
    };
    
    next();
  };
};

export default {
  validateRoomId,
  validateMove,
  validateChatMessage,
  validatePlayerColor,
  validate,
  sanitizeInput,
  isValidSquare,
  isValidPiece,
  isValidFen,
  validateRateLimit,
};
