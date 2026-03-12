/**
 * @fileoverview Unit tests for Chess game logic
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import { Chess } from 'chess.js';

describe('Chess Game Logic', () => {
  let chess;

  beforeEach(() => {
    chess = new Chess();
  });

  describe('Initial Board Setup', () => {
    test('should initialize with correct starting position', () => {
      const fen = chess.fen();
      expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    test('should have white to move first', () => {
      expect(chess.turn()).toBe('w');
    });

    test('should have full castling rights initially', () => {
      const fen = chess.fen();
      expect(fen).toContain('KQkq'); // All castling rights available
    });
  });

  describe('Move Validation', () => {
    test('should allow valid pawn moves', () => {
      const move = chess.move('e4');
      expect(move).toBeTruthy();
      expect(move.san).toBe('e4');
      expect(chess.turn()).toBe('b');
    });

    test('should reject invalid moves', () => {
      const move = chess.move('e5'); // Invalid for white
      expect(move).toBeNull();
      expect(chess.turn()).toBe('w'); // Turn should not change
    });

    test('should allow piece moves to valid squares', () => {
      chess.move('Nf3'); // Knight to f3
      expect(chess.get('f3')).toEqual({ type: 'n', color: 'w' });
    });

    test('should reject moves that leave king in check', () => {
      // Set up a position where moving a piece would leave king in check
      chess.load('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
      const move = chess.move('f3'); // This would leave king in check from e4 pawn
      expect(move).toBeNull();
    });
  });

  describe('Game State Detection', () => {
    test('should detect check correctly', () => {
      chess.load('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
      chess.move('f3'); // White moves
      chess.move('e5'); // Black moves
      chess.move('f4'); // White moves
      chess.move('d5'); // Black moves
      expect(chess.in_check()).toBe(true);
    });

    test('should detect checkmate correctly', () => {
      // Fool's mate setup
      chess.load('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      expect(chess.in_checkmate()).toBe(true);
      expect(chess.is_game_over()).toBe(true);
    });

    test('should detect stalemate correctly', () => {
      chess.load('k7/8/1Q6/8/8/8/8/K7 w - - 0 1');
      expect(chess.in_stalemate()).toBe(true);
      expect(chess.is_game_over()).toBe(true);
    });

    test('should detect draw by insufficient material', () => {
      chess.load('k7/8/8/8/8/8/8/K7 w - - 0 1');
      expect(chess.is_draw()).toBe(true);
      expect(chess.is_game_over()).toBe(true);
    });
  });

  describe('Special Moves', () => {
    test('should allow castling kingside', () => {
      chess.move('e4');
      chess.move('e5');
      chess.move('Nf3');
      chess.move('Nc6');
      chess.move('Bc4');
      chess.move('Nf6');
      chess.move('O-O');
      
      const king = chess.get('g1');
      const rook = chess.get('f1');
      expect(king).toEqual({ type: 'k', color: 'w' });
      expect(rook).toEqual({ type: 'r', color: 'w' });
    });

    test('should allow castling queenside', () => {
      chess.move('d4');
      chess.move('d5');
      chess.move('Bf4');
      chess.move('Nf6');
      chess.move('Nc3');
      chess.move('e6');
      chess.move('Qd3');
      chess.move('Be7');
      chess.move('O-O-O');
      
      const king = chess.get('c1');
      const rook = chess.get('d1');
      expect(king).toEqual({ type: 'k', color: 'w' });
      expect(rook).toEqual({ type: 'r', color: 'w' });
    });

    test('should allow en passant capture', () => {
      chess.load('4k3/8/8/3Pp2/8/8/8/4K3 w - - 0 1');
      const move = chess.move('d5');
      expect(move).toBeTruthy();
      expect(move.flags).toContain('e');
      expect(chess.get('e5')).toBeNull(); // Captured pawn should be gone
    });

    test('should allow pawn promotion', () => {
      chess.load('8/P7/8/8/8/8/8/8 w - - 0 1');
      const move = chess.move('a8');
      expect(move).toBeTruthy();
      expect(move.promotion).toBe('q');
      expect(chess.get('a8')).toEqual({ type: 'q', color: 'w' });
    });
  });

  describe('Move History and Undo', () => {
    test('should maintain move history', () => {
      chess.move('e4');
      chess.move('e5');
      chess.move('Nf3');
      
      const history = chess.history();
      expect(history).toHaveLength(3);
      expect(history[0]).toBe('e4');
      expect(history[1]).toBe('e5');
      expect(history[2]).toBe('Nf3');
    });

    test('should allow undoing moves', () => {
      chess.move('e4');
      chess.move('e5');
      const undone = chess.undo();
      
      expect(undone).toBe(true);
      expect(chess.turn()).toBe('b');
      expect(chess.history()).toHaveLength(1);
    });

    test('should undo multiple moves correctly', () => {
      chess.move('e4');
      chess.move('e5');
      chess.move('Nf3');
      chess.move('Nc6');
      
      chess.undo();
      chess.undo();
      
      expect(chess.turn()).toBe('w');
      expect(chess.history()).toHaveLength(2);
    });
  });

  describe('FEN String Handling', () => {
    test('should load position from FEN', () => {
      const fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2';
      chess.load(fen);
      expect(chess.fen()).toBe(fen);
    });

    test('should handle invalid FEN gracefully', () => {
      const invalidFen = 'invalid/fen/string';
      expect(() => chess.load(invalidFen)).toThrow();
    });
  });

  describe('PGN Handling', () => {
    test('should export PGN correctly', () => {
      chess.move('e4');
      chess.move('e5');
      chess.move('Nf3');
      
      const pgn = chess.pgn();
      expect(pgn).toContain('1. e4 e5 2. Nf3');
    });

    test('should load PGN correctly', () => {
      const pgn = '1. e4 e5 2. Nf3 Nc6';
      chess.load_pgn(pgn);
      
      expect(chess.history()).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
      expect(chess.turn()).toBe('w');
    });
  });

  describe('Performance Tests', () => {
    test('should generate moves quickly', () => {
      const start = performance.now();
      const moves = chess.moves();
      const end = performance.now();
      
      expect(moves.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(10); // Should be under 10ms
    });

    test('should handle multiple moves efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        chess.move('e4');
        chess.undo();
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should be under 100ms for 100 operations
    });
  });
});
