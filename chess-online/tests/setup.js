/**
 * @fileoverview Global test setup
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  /**
   * Create a mock socket
   */
  createMockSocket: (id = 'test-socket') => ({
    id,
    emit: jest.fn(),
    on: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    rooms: new Set(),
  }),
  
  /**
   * Create a mock room
   */
  createMockRoom: (roomId = 'test-room') => ({
    id: roomId,
    chess: {
      fen: jest.fn().mockReturnValue('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
      turn: jest.fn().mockReturnValue('w'),
      move: jest.fn(),
      undo: jest.fn(),
      is_game_over: jest.fn().mockReturnValue(false),
      in_check: jest.fn().mockReturnValue(false),
      in_checkmate: jest.fn().mockReturnValue(false),
      in_draw: jest.fn().mockReturnValue(false),
      in_stalemate: jest.fn().mockReturnValue(false),
    },
    players: new Map(),
    colorCount: { w: 0, b: 0 },
    ended: false,
    history: [],
  }),
  
  /**
   * Wait for a specified time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Generate random room ID
   */
  generateRoomId: () => `test-room-${Math.random().toString(36).substr(2, 9)}`,
  
  /**
   * Generate random socket ID
   */
  generateSocketId: () => `socket-${Math.random().toString(36).substr(2, 9)}`,
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
