/**
 * Test-Driven Development: Chess Engine Tests
 * Following Uncle Bob's Clean Code Principles
 * 
 * Test Coverage: FIDE Rules, Move Validation, Game States
 */
import { ChessEngine } from './ChessEngine';
import { PieceType, Color, Position } from './types';

describe('ChessEngine - FIDE Compliance', () => {
  let engine: ChessEngine;

  beforeEach(() => {
    engine = new ChessEngine();
  });

  describe('Initial Board Setup', () => {
    it('should initialize board with standard FIDE starting position', () => {
      const board = engine.getBoard();
      
      // White pieces
      expect(board[0][0]).toBe(PieceType.ROOK);
      expect(board[0][4]).toBe(PieceType.KING);
      expect(board[1][0]).toBe(PieceType.PAWN);
      
      // Black pieces
      expect(board[7][0]).toBe(PieceType.ROOK);
      expect(board[7][4]).toBe(PieceType.KING);
      expect(board[6][0]).toBe(PieceType.PAWN);
    });

    it('should have correct piece colors on starting position', () => {
      const board = engine.getBoard();
      
      // White pieces on ranks 0-1
      expect(engine.getPieceColor({row: 0, col: 0})).toBe(Color.WHITE);
      expect(engine.getPieceColor({row: 1, col: 4})).toBe(Color.WHITE);
      
      // Black pieces on ranks 6-7
      expect(engine.getPieceColor({row: 6, col: 0})).toBe(Color.BLACK);
      expect(engine.getPieceColor({row: 7, col: 4})).toBe(Color.BLACK);
    });
  });

  describe('Pawn Movement Rules', () => {
    it('should allow pawn to move one square forward', () => {
      const move = { from: {row: 1, col: 4}, to: {row: 2, col: 4} };
      expect(engine.isValidMove(move)).toBe(true);
    });

    it('should allow pawn to move two squares from starting position', () => {
      const move = { from: {row: 1, col: 4}, to: {row: 3, col: 4} };
      expect(engine.isValidMove(move)).toBe(true);
    });

    it('should not allow pawn to move two squares after first move', () => {
      engine.makeMove({ from: {row: 1, col: 4}, to: {row: 3, col: 4} });
      const move = { from: {row: 3, col: 4}, to: {row: 5, col: 4} };
      expect(engine.isValidMove(move)).toBe(false);
    });

    it('should allow pawn to capture diagonally', () => {
      // Setup capture scenario
      engine.makeMove({ from: {row: 1, col: 4}, to: {row: 3, col: 4} });
      engine.makeMove({ from: {row: 6, col: 3}, to: {row: 4, col: 3} });
      
      const capture = { from: {row: 3, col: 4}, to: {row: 4, col: 3} };
      expect(engine.isValidMove(capture)).toBe(true);
    });

    it('should handle en passant correctly', () => {
      engine.makeMove({ from: {row: 1, col: 4}, to: {row: 3, col: 4} });
      engine.makeMove({ from: {row: 6, col: 3}, to: {row: 4, col: 3} });
      
      const enPassant = { from: {row: 3, col: 4}, to: {row: 4, col: 3} };
      const result = engine.makeMove(enPassant);
      
      expect(result.enPassant).toBe(true);
      expect(engine.getPiece({row: 4, col: 3})).toBe(PieceType.PAWN);
      expect(engine.getPiece({row: 3, col: 3})).toBeNull(); // Captured pawn removed
    });

    it('should promote pawn to queen when reaching last rank', () => {
      // Move pawn to promotion rank
      engine.setPiece({row: 6, col: 4}, PieceType.PAWN, Color.WHITE);
      
      const promotion = { from: {row: 6, col: 4}, to: {row: 7, col: 4} };
      const result = engine.makeMove(promotion);
      
      expect(result.promotion).toBe(true);
      expect(engine.getPiece({row: 7, col: 4})).toBe(PieceType.QUEEN);
    });
  });

  describe('King Safety and Check', () => {
    it('should detect when king is in check', () => {
      // Setup check scenario
      engine.clearBoard();
      engine.setPiece({row: 0, col: 4}, PieceType.KING, Color.WHITE);
      engine.setPiece({row: 7, col: 4}, PieceType.KING, Color.BLACK);
      engine.setPiece({row: 5, col: 4}, PieceType.ROOK, Color.BLACK);
      
      expect(engine.isKingInCheck(Color.WHITE)).toBe(true);
      expect(engine.isKingInCheck(Color.BLACK)).toBe(false);
    });

    it('should prevent king from moving into check', () => {
      engine.clearBoard();
      engine.setPiece({row: 0, col: 4}, PieceType.KING, Color.WHITE);
      engine.setPiece({row: 7, col: 0}, PieceType.ROOK, Color.BLACK);
      
      const illegalMove = { from: {row: 0, col: 4}, to: {row: 1, col: 4} };
      expect(engine.isValidMove(illegalMove)).toBe(false);
    });

    it('should detect checkmate', () => {
      // Fool's mate setup
      engine.makeMove({ from: {row: 1, col: 4}, to: {row: 2, col: 4} });
      engine.makeMove({ from: {row: 6, col: 5}, to: {row: 4, col: 5} });
      engine.makeMove({ from: {row: 1, col: 3}, to: {row: 2, col: 3} });
      engine.makeMove({ from: {row: 7, col: 3}, to: {row: 3, col: 7} });
      
      expect(engine.isCheckmate()).toBe(true);
    });

    it('should detect stalemate', () => {
      // King vs King stalemate position
      engine.clearBoard();
      engine.setPiece({row: 0, col: 0}, PieceType.KING, Color.WHITE);
      engine.setPiece({row: 0, col: 2}, PieceType.KING, Color.BLACK);
      engine.setPiece({row: 1, col: 1}, PieceType.QUEEN, Color.BLACK);
      
      expect(engine.isStalemate()).toBe(true);
    });
  });

  describe('Castling Rules', () => {
    it('should allow kingside castling when conditions are met', () => {
      const castleMove = { from: {row: 0, col: 4}, to: {row: 0, col: 6} };
      expect(engine.isValidMove(castleMove)).toBe(true);
      
      const result = engine.makeMove(castleMove);
      expect(result.castling).toBe(true);
      expect(engine.getPiece({row: 0, col: 5})).toBe(PieceType.ROOK);
      expect(engine.getPiece({row: 0, col: 6})).toBe(PieceType.KING);
    });

    it('should prevent castling when king is in check', () => {
      engine.clearBoard();
      engine.setPiece({row: 0, col: 4}, PieceType.KING, Color.WHITE);
      engine.setPiece({row: 7, col: 4}, PieceType.KING, Color.BLACK);
      engine.setPiece({row: 5, col: 4}, PieceType.ROOK, Color.BLACK);
      
      const castleMove = { from: {row: 0, col: 4}, to: {row: 0, col: 6} };
      expect(engine.isValidMove(castleMove)).toBe(false);
    });

    it('should prevent castling when king has moved', () => {
      engine.makeMove({ from: {row: 0, col: 4}, to: {row: 0, col: 5} });
      engine.makeMove({ from: {row: 7, col: 4}, to: {row: 7, col: 5} });
      engine.makeMove({ from: {row: 0, col: 5}, to: {row: 0, col: 4} });
      
      const castleMove = { from: {row: 0, col: 4}, to: {row: 0, col: 6} };
      expect(engine.isValidMove(castleMove)).toBe(false);
    });
  });

  describe('Piece Movement Validation', () => {
    it('should validate knight L-shaped moves', () => {
      const knightMove = { from: {row: 0, col: 1}, to: {row: 2, col: 2} };
      expect(engine.isValidMove(knightMove)).toBe(true);
      
      const invalidMove = { from: {row: 0, col: 1}, to: {row: 2, col: 3} };
      expect(engine.isValidMove(invalidMove)).toBe(false);
    });

    it('should validate bishop diagonal moves', () => {
      const bishopMove = { from: {row: 0, col: 2}, to: {row: 2, col: 4} };
      expect(engine.isValidMove(bishopMove)).toBe(true);
      
      const invalidMove = { from: {row: 0, col: 2}, to: {row: 2, col: 5} };
      expect(engine.isValidMove(invalidMove)).toBe(false);
    });

    it('should validate rook horizontal/vertical moves', () => {
      const rookMove = { from: {row: 0, col: 0}, to: {row: 0, col: 3} };
      expect(engine.isValidMove(rookMove)).toBe(true);
      
      const invalidMove = { from: {row: 0, col: 0}, to: {row: 1, col: 1} };
      expect(engine.isValidMove(invalidMove)).toBe(false);
    });

    it('should validate queen combined moves', () => {
      const diagonalMove = { from: {row: 0, col: 3}, to: {row: 3, col: 6} };
      expect(engine.isValidMove(diagonalMove)).toBe(true);
      
      const straightMove = { from: {row: 0, col: 3}, to: {row: 0, col: 5} };
      expect(engine.isValidMove(straightMove)).toBe(true);
    });
  });

  describe('Game State Management', () => {
    it('should track move history correctly', () => {
      engine.makeMove({ from: {row: 1, col: 4}, to: {row: 2, col: 4} });
      engine.makeMove({ from: {row: 6, col: 4}, to: {row: 5, col: 4} });
      
      const history = engine.getMoveHistory();
      expect(history).toHaveLength(2);
      expect(history[0].notation).toBe('e4');
      expect(history[1].notation).toBe('e5');
    });

    it('should generate correct PGN export', () => {
      engine.makeMove({ from: {row: 1, col: 4}, to: {row: 2, col: 4} });
      engine.makeMove({ from: {row: 6, col: 4}, to: {row: 5, col: 4} });
      
      const pgn = engine.exportPGN();
      expect(pgn).toContain('1. e4 e5');
    });

    it('should support FEN import/export', () => {
      const fen = engine.exportFEN();
      expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      
      const newEngine = new ChessEngine();
      newEngine.importFEN(fen);
      expect(newEngine.exportFEN()).toBe(fen);
    });
  });

  describe('Performance Requirements', () => {
    it('should handle 1000 move validations within performance threshold', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const move = { from: {row: 1, col: 4}, to: {row: 2, col: 4} };
        engine.isValidMove(move);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Less than 100ms for 1000 validations
    });

    it('should handle deep move analysis within time limit', () => {
      const start = performance.now();
      const moves = engine.getAllValidMoves(Color.WHITE);
      const duration = performance.now() - start;
      
      expect(moves.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50); // Less than 50ms for move generation
    });
  });
});
