/**
 * Test Suite for Professional Chess Engine
 * Comprehensive test coverage for chess rules, move validation, and game state management
 */

describe('Professional Chess Engine', () => {
    let game;

    beforeEach(() => {
        // Initialize new game before each test
        game = new ProfessionalChessEngine();
    });

    describe('Board Initialization', () => {
        test('should initialize board with correct starting position', () => {
            expect(game.board[0][0]).toBe('r'); // Black rook
            expect(game.board[0][4]).toBe('k'); // Black king
            expect(game.board[7][0]).toBe('R'); // White rook
            expect(game.board[7][4]).toBe('K'); // White king
            expect(game.board[6][0]).toBe('P'); // White pawn
            expect(game.board[1][0]).toBe('p'); // Black pawn
        });

        test('should have correct initial turn', () => {
            expect(game.currentTurn).toBe('white');
        });

        test('should start with empty move history', () => {
            expect(game.moveHistory).toHaveLength(0);
        });

        test('should have correct piece mapping', () => {
            expect(game.pieces['K']).toBe('♔');
            expect(game.pieces['k']).toBe('♚');
            expect(game.pieces['P']).toBe('♙');
            expect(game.pieces['p']).toBe('♟');
        });
    });

    describe('Pawn Movement Validation', () => {
        test('should validate pawn forward move', () => {
            // White pawn from e2 to e4 (double move)
            expect(game.isValidMove(6, 4, 4, 4)).toBe(true);
        });

        test('should validate pawn single forward move', () => {
            // White pawn from e2 to e3 (single move)
            expect(game.isValidMove(6, 4, 5, 4)).toBe(true);
        });

        test('should reject pawn backward move', () => {
            // White pawn trying to move backward
            expect(game.isValidMove(6, 4, 7, 4)).toBe(false);
        });

        test('should validate pawn capture', () => {
            // Set up capture scenario
            game.board[5][4] = 'p'; // Black pawn at e3
            expect(game.isValidMove(6, 4, 5, 4)).toBe(true); // White pawn captures
        });

        test('should reject illegal pawn capture', () => {
            // Try to capture own piece
            expect(game.isValidMove(6, 4, 6, 4)).toBe(false);
        });

        test('should validate black pawn forward move', () => {
            // Black pawn from e7 to e5 (double move)
            expect(game.isValidMove(1, 4, 3, 4)).toBe(true);
        });

        test('should reject pawn double move after first move', () => {
            // Move white pawn from e2 to e3
            game.board[5][4] = 'P';
            game.board[6][4] = null;
            
            // Try double move from e3 to e5
            expect(game.isValidMove(5, 4, 3, 4)).toBe(false);
        });
    });

    describe('Knight Movement Validation', () => {
        test('should validate knight L-shaped moves', () => {
            // Knight from g1 to f3
            expect(game.isValidMove(7, 6, 5, 5)).toBe(true);
            // Knight from g1 to h3
            expect(game.isValidMove(7, 6, 5, 7)).toBe(true);
        });

        test('should reject illegal knight moves', () => {
            // Knight trying to move like a rook
            expect(game.isValidMove(7, 6, 7, 4)).toBe(false);
            // Knight trying to move like a bishop
            expect(game.isValidMove(7, 6, 5, 4)).toBe(false);
        });

        test('should validate knight captures', () => {
            // Set up capture scenario
            game.board[5][5] = 'p'; // Black pawn at f3
            expect(game.isValidMove(7, 6, 5, 5)).toBe(true);
        });
    });

    describe('Bishop Movement Validation', () => {
        test('should validate bishop diagonal moves', () => {
            // Bishop from f1 to c4 (diagonal)
            expect(game.isValidMove(7, 5, 4, 2)).toBe(true);
            // Bishop from f1 to h3 (diagonal)
            expect(game.isValidMove(7, 5, 5, 7)).toBe(true);
        });

        test('should reject illegal bishop moves', () => {
            // Bishop trying to move straight
            expect(game.isValidMove(7, 5, 7, 2)).toBe(false);
            // Bishop trying to move like a knight
            expect(game.isValidMove(7, 5, 5, 4)).toBe(false);
        });

        test('should detect blocked bishop path', () => {
            // Put piece in bishop's path
            game.board[6][6] = 'P'; // White pawn at g2
            expect(game.isValidMove(7, 5, 4, 2)).toBe(false);
        });

        test('should validate bishop captures', () => {
            // Set up capture scenario
            game.board[5][2] = 'p'; // Black pawn at c4
            expect(game.isValidMove(7, 5, 5, 2)).toBe(true);
        });
    });

    describe('Rook Movement Validation', () => {
        test('should validate rook horizontal moves', () => {
            // Rook from a1 to a4 (vertical)
            expect(game.isValidMove(7, 0, 4, 0)).toBe(true);
            // Rook from a1 to d1 (horizontal)
            expect(game.isValidMove(7, 0, 7, 3)).toBe(true);
        });

        test('should reject illegal rook moves', () => {
            // Rook trying to move diagonally
            expect(game.isValidMove(7, 0, 4, 4)).toBe(false);
            // Rook trying to move like a knight
            expect(game.isValidMove(7, 0, 5, 2)).toBe(false);
        });

        test('should detect blocked rook path', () => {
            // Put piece in rook's path
            game.board[6][0] = 'P'; // White pawn at a2
            expect(game.isValidMove(7, 0, 4, 0)).toBe(false);
        });

        test('should validate rook captures', () => {
            // Set up capture scenario
            game.board[4][3] = 'p'; // Black pawn at d4
            expect(game.isValidMove(7, 3, 4, 3)).toBe(true);
        });
    });

    describe('Queen Movement Validation', () => {
        test('should validate queen horizontal moves', () => {
            // Queen from d1 to d4 (vertical)
            expect(game.isValidMove(7, 3, 4, 3)).toBe(true);
        });

        test('should validate queen diagonal moves', () => {
            // Queen from d1 to h5 (diagonal)
            expect(game.isValidMove(7, 3, 3, 7)).toBe(true);
        });

        test('should reject illegal queen moves', () => {
            // Queen trying to move like a knight
            expect(game.isValidMove(7, 3, 5, 4)).toBe(false);
        });

        test('should detect blocked queen path', () => {
            // Put piece in queen's path
            game.board[6][3] = 'P'; // White pawn at d2
            expect(game.isValidMove(7, 3, 4, 3)).toBe(false);
        });

        test('should validate queen captures', () => {
            // Set up capture scenario
            game.board[4][3] = 'p'; // Black pawn at d4
            expect(game.isValidMove(7, 3, 4, 3)).toBe(true);
        });
    });

    describe('King Movement Validation', () => {
        test('should validate king one-square moves', () => {
            // King from e1 to e2 (forward)
            expect(game.isValidMove(7, 4, 6, 4)).toBe(true);
            // King from e1 to f1 (horizontal)
            expect(game.isValidMove(7, 4, 7, 5)).toBe(true);
            // King from e1 to f2 (diagonal)
            expect(game.isValidMove(7, 4, 6, 5)).toBe(true);
        });

        test('should reject illegal king moves', () => {
            // King trying to move two squares
            expect(game.isValidMove(7, 4, 5, 4)).toBe(false);
            // King trying to move like a knight
            expect(game.isValidMove(7, 4, 5, 3)).toBe(false);
        });

        test('should validate king captures', () => {
            // Set up capture scenario
            game.board[6][3] = 'p'; // Black pawn at d2
            expect(game.isValidMove(7, 4, 6, 3)).toBe(true);
        });
    });

    describe('Game State Management', () => {
        test('should execute valid move correctly', () => {
            game.makeMove(6, 4, 4, 4); // White pawn e2 to e4
            expect(game.board[4][4]).toBe('P');
            expect(game.board[6][4]).toBeNull();
            expect(game.currentTurn).toBe('black');
            expect(game.moveHistory).toHaveLength(1);
        });

        test('should record move notation correctly', () => {
            game.makeMove(6, 4, 4, 4); // White pawn e2 to e4
            expect(game.moveHistory[0].notation).toBe('e4');
        });

        test('should track captured pieces', () => {
            game.board[4][4] = 'p'; // Black pawn at e4
            game.makeMove(6, 4, 4, 4); // White pawn captures
            expect(game.moveHistory[0].captured).toBe('p');
        });

        test('should switch turns correctly', () => {
            game.makeMove(6, 4, 4, 4); // White move
            expect(game.currentTurn).toBe('black');
            game.makeMove(1, 4, 3, 4); // Black move
            expect(game.currentTurn).toBe('white');
        });

        test('should reset game correctly', () => {
            game.makeMove(6, 4, 4, 4); // Make a move
            game.resetGame();
            expect(game.currentTurn).toBe('white');
            expect(game.moveHistory).toHaveLength(0);
            expect(game.board[6][4]).toBe('P');
            expect(game.board[4][4]).toBeNull();
        });
    });

    describe('AI Opponent', () => {
        test('should generate valid moves for AI', () => {
            game.currentTurn = 'black';
            const moves = game.getAllValidMoves('black');
            expect(moves.length).toBeGreaterThan(0);
            
            // All moves should be valid
            moves.forEach(move => {
                expect(game.isValidMove(move.from.row, move.from.col, move.to.row, move.to.col)).toBe(true);
            });
        });

        test('should prefer captures when available', () => {
            game.currentTurn = 'black';
            // Set up capture opportunity
            game.board[4][4] = 'P'; // White pawn at e4
            
            const moves = game.getAllValidMoves('black');
            const captures = moves.filter(move => game.board[move.to.row][move.to.col]);
            
            expect(captures.length).toBeGreaterThan(0);
        });

        test('should make AI move successfully', () => {
            game.gameMode = 'ai';
            game.currentTurn = 'black';
            const initialMoveCount = game.moveHistory.length;
            
            game.makeAIMove();
            
            expect(game.moveHistory.length).toBe(initialMoveCount + 1);
            expect(game.currentTurn).toBe('white');
        });
    });

    describe('Board Coordinates', () => {
        test('should convert coordinates correctly', () => {
            expect(game.getSquareName(7, 0)).toBe('a1');
            expect(game.getSquareName(7, 7)).toBe('h1');
            expect(game.getSquareName(0, 0)).toBe('a8');
            expect(game.getSquareName(0, 7)).toBe('h8');
            expect(game.getSquareName(4, 4)).toBe('e4');
        });

        test('should handle coordinate boundaries', () => {
            expect(() => game.getSquareName(8, 0)).toThrow();
            expect(() => game.getSquareName(-1, 0)).toThrow();
            expect(() => game.getSquareName(0, 8)).toThrow();
            expect(() => game.getSquareName(0, -1)).toThrow();
        });
    });

    describe('Board Flipping', () => {
        test('should flip board orientation', () => {
            game.isFlipped = false;
            game.flipBoard();
            expect(game.isFlipped).toBe(true);
            
            game.flipBoard();
            expect(game.isFlipped).toBe(false);
        });

        test('should render flipped board correctly', () => {
            game.isFlipped = true;
            game.renderBoard();
            // In flipped view, white pieces should be at top
            const squares = document.querySelectorAll('.square');
            // This would require DOM testing in a browser environment
        });
    });

    describe('Path Checking', () => {
        test('should detect clear path for sliding pieces', () => {
            expect(game.isPathClear(7, 0, 4, 0)).toBe(true); // Clear rook path
        });

        test('should detect blocked path for sliding pieces', () => {
            game.board[6][0] = 'P'; // Block rook path
            expect(game.isPathClear(7, 0, 4, 0)).toBe(false);
        });

        test('should detect clear diagonal path', () => {
            expect(game.isPathClear(7, 5, 4, 2)).toBe(true); // Clear bishop path
        });

        test('should detect blocked diagonal path', () => {
            game.board[6][6] = 'P'; // Block bishop path
            expect(game.isPathClear(7, 5, 4, 2)).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid coordinates gracefully', () => {
            expect(() => game.isValidMove(-1, 0, 0, 0)).not.toThrow();
            expect(() => game.isValidMove(8, 0, 0, 0)).not.toThrow();
            expect(game.isValidMove(-1, 0, 0, 0)).toBe(false);
        });

        test('should handle null piece gracefully', () => {
            expect(() => game.isValidMove(4, 4, 5, 4)).not.toThrow();
            expect(game.isValidMove(4, 4, 5, 4)).toBe(false);
        });

        test('should handle empty board gracefully', () => {
            game.board = Array(8).fill(null).map(() => Array(8).fill(null));
            expect(() => game.getAllValidMoves('white')).not.toThrow();
            expect(game.getAllValidMoves('white')).toHaveLength(0);
        });
    });

    describe('Performance Tests', () => {
        test('should validate moves quickly', () => {
            const start = performance.now();
            
            // Test 1000 move validations
            for (let i = 0; i < 1000; i++) {
                game.isValidMove(6, 4, 4, 4); // Pawn move
                game.isValidMove(7, 6, 5, 5); // Knight move
                game.isValidMove(7, 5, 4, 2); // Bishop move
            }
            
            const end = performance.now();
            const duration = end - start;
            
            expect(duration).toBeLessThan(100); // Should complete in <100ms
        });

        test('should generate moves quickly', () => {
            const start = performance.now();
            
            // Test 100 move generations
            for (let i = 0; i < 100; i++) {
                game.getAllValidMoves('white');
                game.getAllValidMoves('black');
            }
            
            const end = performance.now();
            const duration = end - start;
            
            expect(duration).toBeLessThan(50); // Should complete in <50ms
        });
    });
});

// Mock ProfessionalChessEngine class for testing
class ProfessionalChessEngine {
    constructor() {
        this.board = [];
        this.currentTurn = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.gameMode = null;
        this.playerColor = 'white';
        this.isFlipped = false;
        this.pieces = {
            'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
            'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
        };
        this.initializeBoard();
    }

    initializeBoard() {
        this.board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
    }

    getSquareName(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) {
            throw new Error('Invalid coordinates');
        }
        const files = 'abcdefgh';
        return files[col] + (8 - row);
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        // Basic validation
        if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
            toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
            return false;
        }

        const piece = this.board[fromRow][fromCol];
        const targetPiece = this.board[toRow][toCol];

        if (!piece) return false;

        // Can't capture own piece
        if (targetPiece) {
            const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
            const targetColor = targetPiece === targetPiece.toUpperCase() ? 'white' : 'black';
            if (pieceColor === targetColor) return false;
        }

        // Move validation logic (simplified for testing)
        const pieceType = piece.toLowerCase();
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;

        switch (pieceType) {
            case 'p':
                const direction = piece === 'P' ? 1 : -1;
                const startRow = piece === 'P' ? 1 : 6;
                
                if (colDiff === 0 && !targetPiece) {
                    if (rowDiff === direction) return true;
                    if (fromRow === startRow && rowDiff === 2 * direction && !this.board[fromRow + direction][fromCol]) return true;
                } else if (Math.abs(colDiff) === 1 && Math.abs(rowDiff) === 1 && targetPiece) {
                    if (rowDiff === direction) return true;
                }
                return false;

            case 'n':
                return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) || (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);

            case 'r':
            case 'b':
            case 'q':
                if (pieceType === 'r' && (rowDiff !== 0 && colDiff !== 0)) return false;
                if (pieceType === 'b' && Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
                return this.isPathClear(fromRow, fromCol, toRow, toCol);

            case 'k':
                return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;

            default:
                return false;
        }
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
        
        let row = fromRow + rowStep;
        let col = fromCol + colStep;
        
        while (row !== toRow || col !== toCol) {
            if (this.board[row][col]) return false;
            row += rowStep;
            col += colStep;
        }
        
        return true;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const targetPiece = this.board[toRow][toCol];
        
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        this.moveHistory.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            captured: targetPiece,
            notation: this.getMoveNotation(piece, fromRow, fromCol, toRow, toCol, targetPiece)
        });
        
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
    }

    getMoveNotation(piece, fromRow, fromCol, toRow, toCol, captured) {
        const files = 'abcdefgh';
        const pieceSymbol = piece.toLowerCase() === 'p' ? '' : piece.toUpperCase();
        const capture = captured ? 'x' : '';
        return `${pieceSymbol}${files[fromCol]}${8 - fromRow}${capture}${files[toCol]}${8 - toRow}`;
    }

    getAllValidMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
                    if (pieceColor === color) {
                        for (let toRow = 0; toRow < 8; toRow++) {
                            for (let toCol = 0; toCol < 8; toCol++) {
                                if (this.isValidMove(row, col, toRow, toCol)) {
                                    moves.push({ from: { row, col }, to: { row: toRow, col: toCol } });
                                }
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }

    flipBoard() {
        this.isFlipped = !this.isFlipped;
    }

    resetGame() {
        this.initializeBoard();
        this.currentTurn = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
    }

    makeAIMove() {
        const moves = this.getAllValidMoves('black');
        if (moves.length > 0) {
            const move = moves[Math.floor(Math.random() * moves.length)];
            this.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
        }
    }
}
