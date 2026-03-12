/**
 * @fileoverview Unit tests for Room Manager
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import RoomManager from '../src/core/RoomManager.js';
import { Chess } from 'chess.js';

describe('RoomManager', () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  afterEach(() => {
    roomManager.clearAllRooms();
  });

  describe('Room Creation and Management', () => {
    test('should create a new room with default settings', () => {
      const roomId = 'test-room-1';
      const room = roomManager.getOrCreateRoom(roomId);

      expect(room).toBeDefined();
      expect(room.id).toBe(roomId);
      expect(room.chess).toBeInstanceOf(Chess);
      expect(room.players).toEqual(new Map());
      expect(room.colorCount).toEqual({ w: 0, b: 0 });
      expect(room.ended).toBe(false);
      expect(room.history).toEqual([]);
    });

    test('should return existing room instead of creating duplicate', () => {
      const roomId = 'test-room-1';
      const room1 = roomManager.getOrCreateRoom(roomId);
      const room2 = roomManager.getOrCreateRoom(roomId);

      expect(room1).toBe(room2);
      expect(roomManager.getRoomCount()).toBe(1);
    });

    test('should check if room exists', () => {
      const roomId = 'test-room-1';
      
      expect(roomManager.hasRoom(roomId)).toBe(false);
      
      roomManager.getOrCreateRoom(roomId);
      expect(roomManager.hasRoom(roomId)).toBe(true);
    });

    test('should delete room correctly', () => {
      const roomId = 'test-room-1';
      roomManager.getOrCreateRoom(roomId);
      
      expect(roomManager.hasRoom(roomId)).toBe(true);
      
      const deleted = roomManager.deleteRoom(roomId);
      expect(deleted).toBe(true);
      expect(roomManager.hasRoom(roomId)).toBe(false);
    });

    test('should return false when deleting non-existent room', () => {
      const deleted = roomManager.deleteRoom('non-existent-room');
      expect(deleted).toBe(false);
    });

    test('should clear all rooms', () => {
      roomManager.getOrCreateRoom('room1');
      roomManager.getOrCreateRoom('room2');
      roomManager.getOrCreateRoom('room3');
      
      expect(roomManager.getRoomCount()).toBe(3);
      
      roomManager.clearAllRooms();
      expect(roomManager.getRoomCount()).toBe(0);
    });
  });

  describe('Player Management', () => {
    test('should assign white color to first player', () => {
      const roomId = 'test-room-1';
      const room = roomManager.getOrCreateRoom(roomId);
      const socketId = 'socket-1';
      
      const color = roomManager.assignColor(room);
      expect(color).toBe('w');
    });

    test('should assign black color to second player', () => {
      const roomId = 'test-room-1';
      const room = roomManager.getOrCreateRoom(roomId);
      
      roomManager.assignColor(room);
      const color = roomManager.assignColor(room);
      expect(color).toBe('b');
    });

    test('should assign spectator to additional players', () => {
      const roomId = 'test-room-1';
      const room = roomManager.getOrCreateRoom(roomId);
      
      roomManager.assignColor(room); // White
      roomManager.assignColor(room); // Black
      const spectator = roomManager.assignColor(room); // Spectator
      
      expect(spectator).toBe('spectator');
    });

    test('should add player to room correctly', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      const result = roomManager.addPlayer(roomId, socketId);
      expect(result.success).toBe(true);
      expect(result.color).toBe('w');
      
      const room = roomManager.getRoom(roomId);
      expect(room.players.get(socketId)).toBe('w');
      expect(room.colorCount.w).toBe(1);
    });

    test('should not add player to non-existent room', () => {
      const result = roomManager.addPlayer('non-existent', 'socket-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Room not found');
    });

    test('should remove player from room correctly', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      roomManager.addPlayer(roomId, socketId);
      const removed = roomManager.removePlayer(roomId, socketId);
      
      expect(removed).toBe(true);
      
      const room = roomManager.getRoom(roomId);
      expect(room.players.has(socketId)).toBe(false);
      expect(room.colorCount.w).toBe(0);
    });

    test('should handle removing non-existent player', () => {
      const removed = roomManager.removePlayer('test-room-1', 'non-existent');
      expect(removed).toBe(false);
    });

    test('should get player color correctly', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      roomManager.addPlayer(roomId, socketId);
      const color = roomManager.getPlayerColor(roomId, socketId);
      expect(color).toBe('w');
    });

    test('should return null for non-existent player color', () => {
      const color = roomManager.getPlayerColor('test-room-1', 'non-existent');
      expect(color).toBeNull();
    });
  });

  describe('Game State Management', () => {
    test('should get game state from chess instance', () => {
      const roomId = 'test-room-1';
      const room = roomManager.getOrCreateRoom(roomId);
      
      // Make a move
      room.chess.move('e4');
      
      const state = roomManager.getGameState(room);
      
      expect(state.fen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      expect(state.turn).toBe('b');
      expect(state.gameOver).toBe(false);
      expect(state.checkmate).toBe(false);
      expect(state.check).toBe(false);
      expect(state.draw).toBe(false);
    });

    test('should detect check correctly', () => {
      const roomId = 'test-room-1';
      const room = roomManager.getOrCreateRoom(roomId);
      
      // Set up check position
      room.chess.load('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
      room.chess.move('f3');
      room.chess.move('e5');
      room.chess.move('f4');
      room.chess.move('d5');
      
      const state = roomManager.getGameState(room);
      expect(state.check).toBe(true);
    });

    test('should detect checkmate correctly', () => {
      const roomId = 'test-room-1';
      const room = roomManager.getOrCreateRoom(roomId);
      
      // Fool's mate
      room.chess.load('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      
      const state = roomManager.getGameState(room);
      expect(state.checkmate).toBe(true);
      expect(state.gameOver).toBe(true);
    });

    test('should handle invalid room in game state', () => {
      const state = roomManager.getGameState(null);
      expect(state).toBeNull();
    });
  });

  describe('Move Validation and Execution', () => {
    test('should validate and execute legal moves', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      roomManager.addPlayer(roomId, socketId);
      
      const move = { from: 'e2', to: 'e4' };
      const result = roomManager.makeMove(roomId, socketId, move);
      
      expect(result.success).toBe(true);
      expect(result.move).toBeTruthy();
      expect(result.state.turn).toBe('b');
    });

    test('should reject illegal moves', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      roomManager.addPlayer(roomId, socketId);
      
      const move = { from: 'e2', to: 'e5' }; // Illegal for white
      const result = roomManager.makeMove(roomId, socketId, move);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('illegal');
    });

    test('should reject moves from spectators', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      // Add as spectator
      const room = roomManager.getOrCreateRoom(roomId);
      roomManager.assignColor(room);
      roomManager.assignColor(room);
      room.players.set(socketId, 'spectator');
      
      const move = { from: 'e2', to: 'e4' };
      const result = roomManager.makeMove(roomId, socketId, move);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('spectator');
    });

    test('should reject moves from wrong color', () => {
      const roomId = 'test-room-1';
      const whiteSocket = 'socket-1';
      const blackSocket = 'socket-2';
      
      roomManager.addPlayer(roomId, whiteSocket); // White
      roomManager.addPlayer(roomId, blackSocket); // Black
      
      // Black trying to move first
      const move = { from: 'e7', to: 'e5' };
      const result = roomManager.makeMove(roomId, blackSocket, move);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('turn');
    });

    test('should reject moves in ended games', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      const room = roomManager.getOrCreateRoom(roomId);
      room.ended = true;
      roomManager.addPlayer(roomId, socketId);
      
      const move = { from: 'e2', to: 'e4' };
      const result = roomManager.makeMove(roomId, socketId, move);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('ended');
    });

    test('should handle move history correctly', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      roomManager.addPlayer(roomId, socketId);
      
      const move = { from: 'e2', to: 'e4' };
      roomManager.makeMove(roomId, socketId, move);
      
      const room = roomManager.getRoom(roomId);
      expect(room.history).toHaveLength(1);
      expect(room.history[0].fen).toContain('4P3');
      expect(room.history[0].move).toBeTruthy();
    });
  });

  describe('Game Control', () => {
    test('should handle resignation correctly', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      roomManager.addPlayer(roomId, socketId);
      
      const result = roomManager.resign(roomId, socketId);
      
      expect(result.success).toBe(true);
      expect(result.winner).toBe('b');
      expect(result.reason).toBe('resign');
      
      const room = roomManager.getRoom(roomId);
      expect(room.ended).toBe(true);
    });

    test('should reject resignation from spectators', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      const result = roomManager.resign(roomId, socketId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('player');
    });

    test('should restart game correctly', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      roomManager.addPlayer(roomId, socketId);
      
      // Make some moves
      roomManager.makeMove(roomId, socketId, { from: 'e2', to: 'e4' });
      
      // Restart
      const result = roomManager.restart(roomId);
      
      expect(result.success).toBe(true);
      expect(result.state.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      
      const room = roomManager.getRoom(roomId);
      expect(room.ended).toBe(false);
      expect(room.history).toEqual([]);
    });
  });

  describe('Utility Functions', () => {
    test('should get room count correctly', () => {
      expect(roomManager.getRoomCount()).toBe(0);
      
      roomManager.getOrCreateRoom('room1');
      expect(roomManager.getRoomCount()).toBe(1);
      
      roomManager.getOrCreateRoom('room2');
      expect(roomManager.getRoomCount()).toBe(2);
      
      roomManager.deleteRoom('room1');
      expect(roomManager.getRoomCount()).toBe(1);
    });

    test('should get all room IDs', () => {
      const roomIds = ['room1', 'room2', 'room3'];
      
      roomIds.forEach(id => roomManager.getOrCreateRoom(id));
      
      const allIds = roomManager.getAllRoomIds();
      expect(allIds).toHaveLength(3);
      expect(allIds).toContain('room1');
      expect(allIds).toContain('room2');
      expect(allIds).toContain('room3');
    });

    test('should get room statistics', () => {
      const roomId = 'test-room-1';
      const socketId1 = 'socket-1';
      const socketId2 = 'socket-2';
      
      roomManager.addPlayer(roomId, socketId1);
      roomManager.addPlayer(roomId, socketId2);
      
      const stats = roomManager.getRoomStats(roomId);
      
      expect(stats.playerCount).toBe(2);
      expect(stats.hasWhite).toBe(true);
      expect(stats.hasBlack).toBe(true);
      expect(stats.spectatorCount).toBe(0);
      expect(stats.isGameActive).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid room IDs gracefully', () => {
      const invalidIds = [null, undefined, '', 0, false];
      
      invalidIds.forEach(id => {
        expect(() => roomManager.getOrCreateRoom(id)).not.toThrow();
        expect(roomManager.hasRoom(id)).toBe(false);
      });
    });

    test('should handle invalid socket IDs gracefully', () => {
      const roomId = 'test-room-1';
      const invalidIds = [null, undefined, '', 0, false];
      
      invalidIds.forEach(socketId => {
        const result = roomManager.addPlayer(roomId, socketId);
        expect(result.success).toBe(false);
      });
    });

    test('should handle malformed move objects', () => {
      const roomId = 'test-room-1';
      const socketId = 'socket-1';
      
      roomManager.addPlayer(roomId, socketId);
      
      const invalidMoves = [null, undefined, {}, { from: '' }, { to: '' }];
      
      invalidMoves.forEach(move => {
        const result = roomManager.makeMove(roomId, socketId, move);
        expect(result.success).toBe(false);
      });
    });
  });
});
