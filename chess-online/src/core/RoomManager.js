/**
 * @fileoverview Room management for chess games
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Manages chess game rooms, players, and game state
 */
class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room object
  }

  /**
   * Gets or creates a room with the given ID
   * @param {string} roomId - The room identifier
   * @returns {Object} The room object
   */
  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        chess: new Chess(),
        players: new Map(), // socketId -> color
        colorCount: { w: 0, b: 0 },
        ended: false,
        history: [],
        createdAt: new Date(),
        lastActivity: new Date(),
      });
    }
    return this.rooms.get(roomId);
  }

  /**
   * Checks if a room exists
   * @param {string} roomId - The room identifier
   * @returns {boolean} True if room exists
   */
  hasRoom(roomId) {
    return this.rooms.has(roomId);
  }

  /**
   * Gets a room by ID
   * @param {string} roomId - The room identifier
   * @returns {Object|null} The room object or null if not found
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Deletes a room
   * @param {string} roomId - The room identifier
   * @returns {boolean} True if room was deleted
   */
  deleteRoom(roomId) {
    return this.rooms.delete(roomId);
  }

  /**
   * Clears all rooms
   */
  clearAllRooms() {
    this.rooms.clear();
  }

  /**
   * Gets the total number of rooms
   * @returns {number} Number of active rooms
   */
  getRoomCount() {
    return this.rooms.size;
  }

  /**
   * Gets all room IDs
   * @returns {string[]} Array of room IDs
   */
  getAllRoomIds() {
    return Array.from(this.rooms.keys());
  }

  /**
   * Assigns a color to a new player
   * @param {Object} room - The room object
   * @returns {string} The assigned color ('w', 'b', or 'spectator')
   */
  assignColor(room) {
    if (room.colorCount.w === 0) return 'w';
    if (room.colorCount.b === 0) return 'b';
    return 'spectator';
  }

  /**
   * Adds a player to a room
   * @param {string} roomId - The room identifier
   * @param {string} socketId - The socket identifier
   * @returns {Object} Result object with success status and color/error
   */
  addPlayer(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.has(socketId)) {
      return { success: false, error: 'Player already in room' };
    }

    const color = this.assignColor(room);
    
    if (color === 'w' || color === 'b') {
      room.players.set(socketId, color);
      room.colorCount[color] += 1;
    }

    this.updateLastActivity(room);

    return { success: true, color };
  }

  /**
   * Removes a player from a room
   * @param {string} roomId - The room identifier
   * @param {string} socketId - The socket identifier
   * @returns {boolean} True if player was removed
   */
  removePlayer(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return false;
    }

    const color = room.players.get(socketId);
    if (color === 'w' || color === 'b') {
      room.colorCount[color] = Math.max(0, room.colorCount[color] - 1);
    }

    const removed = room.players.delete(socketId);
    if (removed) {
      this.updateLastActivity(room);
    }

    return removed;
  }

  /**
   * Gets the color of a player
   * @param {string} roomId - The room identifier
   * @param {string} socketId - The socket identifier
   * @returns {string|null} The player's color or null if not found
   */
  getPlayerColor(roomId, socketId) {
    const room = this.getRoom(roomId);
    return room ? room.players.get(socketId) || null : null;
  }

  /**
   * Gets the current game state
   * @param {Object} room - The room object
   * @returns {Object|null} Game state object or null if invalid room
   */
  getGameState(room) {
    if (!room || !room.chess) {
      return null;
    }

    const chess = room.chess;
    return {
      fen: chess.fen(),
      turn: chess.turn(),
      gameOver: this.isGameOver(chess),
      checkmate: chess.in_checkmate(),
      check: chess.in_check(),
      draw: chess.in_draw(),
      stalemate: chess.in_stalemate(),
      threefold: chess.in_threefold_repetition(),
      insufficient: chess.insufficient_material(),
    };
  }

  /**
   * Makes a move in a game
   * @param {string} roomId - The room identifier
   * @param {string} socketId - The socket identifier
   * @param {Object} move - The move object {from, to, promotion}
   * @returns {Object} Result object with success status and data/error
   */
  makeMove(roomId, socketId, move) {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.ended) {
      return { success: false, error: 'Game has ended' };
    }

    const playerColor = room.players.get(socketId);
    if (!playerColor || playerColor === 'spectator') {
      return { success: false, error: playerColor ? 'Spectators cannot move' : 'Player not found' };
    }

    if (room.chess.turn() !== playerColor) {
      return { success: false, error: 'Not your turn' };
    }

    // Validate move object
    if (!move || typeof move.from !== 'string' || typeof move.to !== 'string') {
      return { success: false, error: 'Invalid move format' };
    }

    // Attempt the move
    const moveResult = room.chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q',
    });

    if (!moveResult) {
      return { success: false, error: 'Illegal move' };
    }

    // Add to history
    const ts = Date.now();
    const enrichedMove = { ...moveResult, ts };
    
    room.history.push({
      fen: room.chess.fen(),
      move: enrichedMove,
    });

    // Check if game is over
    const gameState = this.getGameState(room);
    if (gameState.gameOver) {
      room.ended = true;
    }

    this.updateLastActivity(room);

    return {
      success: true,
      move: enrichedMove,
      state: gameState,
    };
  }

  /**
   * Handles resignation
   * @param {string} roomId - The room identifier
   * @param {string} socketId - The socket identifier
   * @returns {Object} Result object with success status and data/error
   */
  resign(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const playerColor = room.players.get(socketId);
    if (!playerColor || playerColor === 'spectator') {
      return { success: false, error: 'Only players can resign' };
    }

    room.ended = true;
    const winner = playerColor === 'w' ? 'b' : 'w';

    this.updateLastActivity(room);

    return {
      success: true,
      winner,
      reason: 'resign',
    };
  }

  /**
   * Restarts a game
   * @param {string} roomId - The room identifier
   * @returns {Object} Result object with success status and data/error
   */
  restart(roomId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    room.chess = new Chess();
    room.ended = false;
    room.history = [];

    this.updateLastActivity(room);

    return {
      success: true,
      state: this.getGameState(room),
    };
  }

  /**
   * Gets room statistics
   * @param {string} roomId - The room identifier
   * @returns {Object} Room statistics
   */
  getRoomStats(roomId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return null;
    }

    const players = Array.from(room.players.values());
    const spectatorCount = players.filter(color => color === 'spectator').length;

    return {
      playerCount: room.players.size,
      hasWhite: players.includes('w'),
      hasBlack: players.includes('b'),
      spectatorCount,
      isGameActive: !room.ended,
      moveCount: room.history.length,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
    };
  }

  /**
   * Checks if the game is over (wrapper for chess.js method compatibility)
   * @param {Object} chess - Chess instance
   * @returns {boolean} True if game is over
   */
  isGameOver(chess) {
    return chess.is_game_over();
  }

  /**
   * Updates the last activity timestamp for a room
   * @param {Object} room - The room object
   */
  updateLastActivity(room) {
    room.lastActivity = new Date();
  }

  /**
   * Gets rooms that have been inactive for a specified duration
   * @param {number} maxInactiveMinutes - Maximum inactive time in minutes
   * @returns {string[]} Array of inactive room IDs
   */
  getInactiveRooms(maxInactiveMinutes = 30) {
    const cutoffTime = new Date(Date.now() - (maxInactiveMinutes * 60 * 1000));
    const inactiveRooms = [];

    for (const [roomId, room] of this.rooms) {
      if (room.lastActivity < cutoffTime) {
        inactiveRooms.push(roomId);
      }
    }

    return inactiveRooms;
  }

  /**
   * Cleans up inactive rooms
   * @param {number} maxInactiveMinutes - Maximum inactive time in minutes
   * @returns {string[]} Array of cleaned up room IDs
   */
  cleanupInactiveRooms(maxInactiveMinutes = 30) {
    const inactiveRooms = this.getInactiveRooms(maxInactiveMinutes);
    
    inactiveRooms.forEach(roomId => {
      this.deleteRoom(roomId);
    });

    return inactiveRooms;
  }

  /**
   * Gets comprehensive statistics about all rooms
   * @returns {Object} Global statistics
   */
  getGlobalStats() {
    const stats = {
      totalRooms: this.rooms.size,
      activeGames: 0,
      totalPlayers: 0,
      spectators: 0,
      averageMovesPerGame: 0,
    };

    let totalMoves = 0;

    for (const room of this.rooms.values()) {
      if (!room.ended) {
        stats.activeGames++;
      }
      
      stats.totalPlayers += room.players.size;
      
      const spectators = Array.from(room.players.values())
        .filter(color => color === 'spectator').length;
      stats.spectators += spectators;
      
      totalMoves += room.history.length;
    }

    if (stats.totalRooms > 0) {
      stats.averageMovesPerGame = Math.round(totalMoves / stats.totalRooms);
    }

    return stats;
  }
}

export default RoomManager;
