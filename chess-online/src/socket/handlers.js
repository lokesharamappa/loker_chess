/**
 * @fileoverview Socket.IO event handlers
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import { logger } from '../utils/logger.js';

/**
 * Setup Socket.IO event handlers
 * @param {Object} io - Socket.IO server instance
 * @param {RoomManager} roomManager - Room manager instance
 */
export const setupSocketHandlers = (io, roomManager) => {
  logger.info('Setting up Socket.IO handlers');

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    let boundRoomId = null;

    /**
     * Handle room joining
     */
    socket.on('join', (roomId) => {
      logger.debug(`Client ${socket.id} attempting to join room: ${roomId}`);
      
      if (typeof roomId !== 'string' || roomId.trim() === '') {
        socket.emit('error_message', 'Invalid room id');
        return;
      }
      
      boundRoomId = roomId.trim();
      const room = roomManager.getOrCreateRoom(boundRoomId);
      
      socket.join(boundRoomId);
      socket.roomId = boundRoomId;
      
      const result = roomManager.addPlayer(boundRoomId, socket.id);
      
      if (!result.success) {
        socket.emit('error_message', result.error);
        return;
      }
      
      socket.emit('init', {
        color: result.color,
        fen: room.chess.fen(),
        turn: room.chess.turn(),
        gameOver: roomManager.getGameState(room).gameOver,
        history: room.history,
      });
      
      // Broadcast player update
      io.to(boundRoomId).emit('players', {
        w: Array.from(room.players.values()).includes('w'),
        b: Array.from(room.players.values()).includes('b'),
      });
      
      logger.logGameEvent('player_joined', boundRoomId, {
        socketId: socket.id,
        color: result.color,
        playerCount: room.players.size,
      });
    });

    /**
     * Handle move attempts
     */
    socket.on('move', (payload) => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) {
        logger.warn(`Move attempt from invalid room: ${roomId}`);
        return;
      }
      
      logger.debug(`Move attempt in room ${roomId} by ${socket.id}:`, payload);
      
      const result = roomManager.makeMove(roomId, socket.id, payload);
      
      if (result.success) {
        io.to(roomId).emit('move', result.state);
        logger.logGameEvent('move_made', roomId, {
          socketId: socket.id,
          move: result.move,
          fen: result.state.fen,
        });
      } else {
        socket.emit('illegal_move', payload);
        logger.debug(`Illegal move rejected: ${result.error}`);
      }
    });

    /**
     * Handle resignation
     */
    socket.on('resign', () => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      logger.debug(`Resignation in room ${roomId} by ${socket.id}`);
      
      const result = roomManager.resign(roomId, socket.id);
      
      if (result.success) {
        io.to(roomId).emit('game_over', result);
        logger.logGameEvent('resignation', roomId, {
          socketId: socket.id,
          winner: result.winner,
        });
      }
    });

    /**
     * Handle game restart
     */
    socket.on('restart', () => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      logger.debug(`Game restart requested in room ${roomId} by ${socket.id}`);
      
      const result = roomManager.restart(roomId);
      
      if (result.success) {
        io.to(roomId).emit('restart', result.state);
        logger.logGameEvent('game_restarted', roomId, {
          socketId: socket.id,
        });
      }
    });

    /**
     * Handle chat messages
     */
    socket.on('chat', (text) => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      const room = roomManager.getRoom(roomId);
      const color = roomManager.getPlayerColor(roomId, socket.id) || 'spectator';
      const msg = {
        from: color,
        text: String(text || '').slice(0, 300),
        ts: Date.now(),
      };
      
      io.to(roomId).emit('chat', msg);
      logger.debug(`Chat message in room ${roomId}:`, msg);
    });

    /**
     * Handle draw offers
     */
    socket.on('offer_draw', () => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      logger.debug(`Draw offered in room ${roomId} by ${socket.id}`);
      io.to(roomId).emit('draw_offered');
    });

    socket.on('respond_draw', (accepted) => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      logger.debug(`Draw response in room ${roomId} by ${socket.id}: ${accepted}`);
      
      if (accepted) {
        const room = roomManager.getRoom(roomId);
        room.ended = true;
        io.to(roomId).emit('game_over', { reason: 'draw_agreed' });
        logger.logGameEvent('draw_agreed', roomId, {
          socketId: socket.id,
        });
      } else {
        io.to(roomId).emit('draw_rejected');
      }
    });

    /**
     * Handle takeback offers
     */
    socket.on('offer_takeback', () => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      logger.debug(`Takeback offered in room ${roomId} by ${socket.id}`);
      io.to(roomId).emit('takeback_offered');
    });

    socket.on('respond_takeback', (accepted) => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      logger.debug(`Takeback response in room ${roomId} by ${socket.id}: ${accepted}`);
      
      if (!accepted) {
        io.to(roomId).emit('takeback_rejected');
        return;
      }
      
      const room = roomManager.getRoom(roomId);
      const undone = room.chess.undo();
      
      if (!undone) {
        io.to(roomId).emit('takeback_failed');
        logger.warn(`Takeback failed in room ${roomId}`);
        return;
      }
      
      room.history.pop();
      const state = roomManager.getGameState(room);
      room.ended = false;
      
      io.to(roomId).emit('takeback', state);
      logger.logGameEvent('takeback_completed', roomId, {
        socketId: socket.id,
      });
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
      
      if (!boundRoomId) return;
      
      const room = roomManager.getRoom(boundRoomId);
      if (!room) return;
      
      const playerColor = roomManager.getPlayerColor(boundRoomId, socket.id);
      roomManager.removePlayer(boundRoomId, socket.id);
      
      io.to(boundRoomId).emit('players', {
        w: Array.from(room.players.values()).includes('w'),
        b: Array.from(room.players.values()).includes('b'),
      });
      
      logger.logGameEvent('player_left', boundRoomId, {
        socketId: socket.id,
        color: playerColor,
        remainingPlayers: room.players.size,
      });
      
      // Clean up empty rooms
      if (room.players.size === 0) {
        roomManager.deleteRoom(boundRoomId);
        logger.debug(`Empty room cleaned up: ${boundRoomId}`);
      }
      
      boundRoomId = null;
    });

    /**
     * Handle connection errors
     */
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });

    /**
     * Handle ping/pong for connection monitoring
     */
    socket.on('ping', () => {
      socket.emit('pong', { ts: Date.now() });
    });
  });

  /**
   * Handle server-level events
   */
  io.on('error', (error) => {
    logger.error('Socket.IO server error:', error);
  });

  logger.info('Socket.IO handlers setup complete');
};
