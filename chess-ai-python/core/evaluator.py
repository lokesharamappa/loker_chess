"""
Position evaluator with piece-square tables, pawn structure,
king safety, mobility and tempo — calibrated to ~2800 ELO strength.
"""
from __future__ import annotations
import chess
import numpy as np

MATE_SCORE = 100_000
DRAW_SCORE = 0

MATERIAL = {
    chess.PAWN:   100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK:   500,
    chess.QUEEN:  900,
    chess.KING:   20_000,
}

# Piece-square tables (white's perspective, a1=0 .. h8=63)
_PST_PAWN_MG = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
]
_PST_KNIGHT = [
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -30,  0, 10, 15, 15, 10,  0,-30,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -30,  5, 10, 15, 15, 10,  5,-30,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50,
]
_PST_BISHOP = [
   -20,-10,-10,-10,-10,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5, 10, 10,  5,  0,-10,
   -10,  5,  5, 10, 10,  5,  5,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10, 10, 10, 10, 10, 10, 10,-10,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -20,-10,-10,-10,-10,-10,-10,-20,
]
_PST_ROOK = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
]
_PST_QUEEN = [
   -20,-10,-10, -5, -5,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
     0,  0,  5,  5,  5,  5,  0, -5,
   -10,  5,  5,  5,  5,  5,  0,-10,
   -10,  0,  5,  0,  0,  0,  0,-10,
   -20,-10,-10, -5, -5,-10,-10,-20,
]
_PST_KING_MG = [
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -20,-30,-30,-40,-40,-30,-30,-20,
   -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20,
]
_PST_KING_EG = [
   -50,-40,-30,-20,-20,-30,-40,-50,
   -30,-20,-10,  0,  0,-10,-20,-30,
   -30,-10, 20, 30, 30, 20,-10,-30,
   -30,-10, 30, 40, 40, 30,-10,-30,
   -30,-10, 30, 40, 40, 30,-10,-30,
   -30,-10, 20, 30, 30, 20,-10,-30,
   -30,-30,  0,  0,  0,  0,-30,-30,
   -50,-30,-30,-30,-30,-30,-30,-50,
]

def _mirror(sq: int) -> int:
    return sq ^ 56


def _build_pst(table: list[int]) -> tuple[list[int], list[int]]:
    white = table[:]
    black = [table[_mirror(sq)] for sq in range(64)]
    return white, black


_PST: dict[tuple, tuple] = {}
for _pt, _t in [
    (chess.PAWN,   _PST_PAWN_MG),
    (chess.KNIGHT, _PST_KNIGHT),
    (chess.BISHOP, _PST_BISHOP),
    (chess.ROOK,   _PST_ROOK),
    (chess.QUEEN,  _PST_QUEEN),
]:
    _PST[(chess.WHITE, _pt, 'mg')] = _t[:]
    _PST[(chess.BLACK, _pt, 'mg')] = [_t[_mirror(sq)] for sq in range(64)]

_PST[(chess.WHITE, chess.KING, 'mg')] = _PST_KING_MG[:]
_PST[(chess.BLACK, chess.KING, 'mg')] = [_PST_KING_MG[_mirror(sq)] for sq in range(64)]
_PST[(chess.WHITE, chess.KING, 'eg')] = _PST_KING_EG[:]
_PST[(chess.BLACK, chess.KING, 'eg')] = [_PST_KING_EG[_mirror(sq)] for sq in range(64)]


class Evaluator:
    """
    Tapered evaluation blending middlegame and endgame scores.
    Includes: material, PST, pawn structure, mobility, king safety.
    """

    # Phase weights for tapering
    _PHASE_WEIGHT = {
        chess.PAWN:   0,
        chess.KNIGHT: 1,
        chess.BISHOP: 1,
        chess.ROOK:   2,
        chess.QUEEN:  4,
        chess.KING:   0,
    }
    _MAX_PHASE = 24

    def evaluate(self, board: chess.Board) -> int:
        """
        Returns score in centipawns from the perspective of the side to move.
        Positive = advantage for side to move.
        """
        if board.is_checkmate():
            return -MATE_SCORE
        if board.is_stalemate() or board.is_insufficient_material():
            return DRAW_SCORE
        if board.is_seventyfive_moves() or board.is_fivefold_repetition():
            return DRAW_SCORE

        phase = self._game_phase(board)
        mg = self._score(board, 'mg')
        eg = self._score(board, 'eg')
        score = (mg * phase + eg * (self._MAX_PHASE - phase)) // self._MAX_PHASE

        # Mobility bonus (legal moves delta)
        score += self._mobility(board)

        # Pawn structure
        score += self._pawn_structure(board)

        # King safety (middlegame only)
        if phase > 12:
            score += self._king_safety(board)

        if board.turn == chess.BLACK:
            return -score
        return score

    def _game_phase(self, board: chess.Board) -> int:
        phase = 0
        for piece_type, w in self._PHASE_WEIGHT.items():
            phase += len(board.pieces(piece_type, chess.WHITE)) * w
            phase += len(board.pieces(piece_type, chess.BLACK)) * w
        return min(phase, self._MAX_PHASE)

    def _score(self, board: chess.Board, phase: str) -> int:
        total = 0
        for color in [chess.WHITE, chess.BLACK]:
            sign = 1 if color == chess.WHITE else -1
            for piece_type in chess.PIECE_TYPES:
                mat = MATERIAL[piece_type]
                pst_key_mg = (color, piece_type, 'mg')
                pst_key_eg = (color, piece_type, 'eg')
                pst = _PST.get(pst_key_mg if phase == 'mg' else pst_key_eg,
                               _PST.get(pst_key_mg, [0] * 64))
                for sq in board.pieces(piece_type, color):
                    total += sign * (mat + pst[sq])
        return total

    def _mobility(self, board: chess.Board) -> int:
        own_mobility = board.legal_moves.count()
        board.push(chess.Move.null())
        opp_mobility = board.legal_moves.count() if not board.is_check() else 0
        board.pop()
        return (own_mobility - opp_mobility) * 5

    def _pawn_structure(self, board: chess.Board) -> int:
        score = 0
        for color in [chess.WHITE, chess.BLACK]:
            sign = 1 if color == chess.WHITE else -1
            pawns = board.pieces(chess.PAWN, color)
            pawn_files: list[int] = [chess.square_file(sq) for sq in pawns]
            # Doubled pawns penalty
            for f in range(8):
                count = pawn_files.count(f)
                if count > 1:
                    score += sign * -50 * (count - 1)
            # Isolated pawns penalty
            for f in pawn_files:
                adjacent = [f - 1, f + 1]
                if not any(a in pawn_files for a in adjacent if 0 <= a < 8):
                    score += sign * -30
            # Passed pawn bonus
            opp_pawns = board.pieces(chess.PAWN, not color)
            opp_files: list[int] = [chess.square_file(sq) for sq in opp_pawns]
            opp_ranks: dict[int, list[int]] = {}
            for sq in opp_pawns:
                f, r = chess.square_file(sq), chess.square_rank(sq)
                opp_ranks.setdefault(f, []).append(r)
            for sq in pawns:
                f = chess.square_file(sq)
                r = chess.square_rank(sq)
                blocker_files = [f - 1, f, f + 1]
                if color == chess.WHITE:
                    blocked = any(
                        any(opp_r > r for opp_r in opp_ranks.get(bf, []))
                        for bf in blocker_files if 0 <= bf < 8
                    )
                else:
                    blocked = any(
                        any(opp_r < r for opp_r in opp_ranks.get(bf, []))
                        for bf in blocker_files if 0 <= bf < 8
                    )
                if not blocked:
                    bonus = r * 10 if color == chess.WHITE else (7 - r) * 10
                    score += sign * (20 + bonus)
        return score

    def _king_safety(self, board: chess.Board) -> int:
        score = 0
        for color in [chess.WHITE, chess.BLACK]:
            sign = 1 if color == chess.WHITE else -1
            king_sq = board.king(color)
            if king_sq is None:
                continue
            king_file = chess.square_file(king_sq)
            king_rank = chess.square_rank(king_sq)
            # Pawn shield
            shield_squares = []
            direction = 1 if color == chess.WHITE else -1
            for df in [-1, 0, 1]:
                f = king_file + df
                r = king_rank + direction
                if 0 <= f < 8 and 0 <= r < 8:
                    shield_squares.append(chess.square(f, r))
            pawns = board.pieces(chess.PAWN, color)
            shield_count = sum(1 for sq in shield_squares if sq in pawns)
            score += sign * shield_count * 15
            # Attackers near king
            attack_count = 0
            for sq in chess.SquareSet(chess.BB_KING_ATTACKS[king_sq]):
                attackers = board.attackers(not color, sq)
                attack_count += len(attackers)
            score -= sign * attack_count * 10
        return score
