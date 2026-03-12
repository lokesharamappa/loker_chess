/**
 * @fileoverview Unit test setup
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import RoomManager from '../../src/core/RoomManager.js';

// Mock external dependencies for unit tests
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

jest.mock('../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    logGameEvent: jest.fn(),
    logSocketEvent: jest.fn(),
    logPerformance: jest.fn(),
    logSecurity: jest.fn(),
    child: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

// Global test helpers for unit tests
global.unitTestHelpers = {
  /**
   * Create a fresh RoomManager instance
   */
  createRoomManager: () => new RoomManager(),
  
  /**
   * Create a mock chess position
   */
  createMockChessPosition: (fen) => ({
    fen: fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    moves: jest.fn().mockReturnValue(['e4', 'd4', 'Nf3']),
    move: jest.fn(),
    undo: jest.fn(),
    is_game_over: jest.fn().mockReturnValue(false),
    in_check: jest.fn().mockReturnValue(false),
    in_checkmate: jest.fn().mockReturnValue(false),
    in_draw: jest.fn().mockReturnValue(false),
    in_stalemate: jest.fn().mockReturnValue(false),
  }),
  
  /**
   * Create test players
   */
  createTestPlayers: () => ({
    white: { id: 'socket-white', color: 'w' },
    black: { id: 'socket-black', color: 'b' },
    spectator: { id: 'socket-spectator', color: 'spectator' },
  }),
};
