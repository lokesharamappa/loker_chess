"""
Alpha-Beta search engine with:
  - Iterative Deepening
  - Aspiration Windows
  - Null Move Pruning
  - Late Move Reductions (LMR)
  - Futility Pruning
  - Killer Move Heuristic
  - History Heuristic
  - Quiescence Search
  - Transposition Table integration
"""
from __future__ import annotations
import time
import chess
from typing import Optional

from core.evaluator import Evaluator, MATE_SCORE, DRAW_SCORE
from core.transposition_table import TranspositionTable, NodeType, ZobristHasher

MAX_PLY = 128
INFINITY = MATE_SCORE + 1
FUTILITY_MARGIN = [0, 100, 200, 300]
LMR_MIN_DEPTH = 3
LMR_MIN_MOVES = 4
NULL_MOVE_REDUCTION = 3
ASPIRATION_WINDOW = 50


class SearchResult:
    def __init__(self, move: Optional[chess.Move], score: int,
                 depth: int, nodes: int, time_ms: float, pv: list[chess.Move]):
        self.move = move
        self.score = score
        self.depth = depth
        self.nodes = nodes
        self.time_ms = time_ms
        self.pv = pv

    def __repr__(self) -> str:
        score_str = f"+{self.score}" if self.score >= 0 else str(self.score)
        pv_str = " ".join(m.uci() for m in self.pv[:5])
        return (f"SearchResult(move={self.move}, score={score_str}cp, "
                f"depth={self.depth}, nodes={self.nodes}, "
                f"time={self.time_ms:.0f}ms, pv=[{pv_str}])")


class AlphaBetaSearch:
    """
    Principal Variation Search (PVS) engine.
    Thread-safe for a single board instance per search call.
    """
    def __init__(self, tt: TranspositionTable, evaluator: Evaluator):
        self._tt = tt
        self._eval = evaluator
        self._hasher = tt.hasher
        self._killers: list[list[Optional[chess.Move]]] = [[None, None] for _ in range(MAX_PLY)]
        self._history: dict[tuple, int] = {}
        self._nodes = 0
        self._stop = False
        self._deadline: float = 0.0
        self._pv_table: list[list[Optional[chess.Move]]] = [[None] * MAX_PLY for _ in range(MAX_PLY)]
        self._pv_length: list[int] = [0] * MAX_PLY

    def search(self, board: chess.Board, max_depth: int = 20,
               time_limit_ms: float = 5000.0) -> SearchResult:
        """
        Iterative deepening search with aspiration windows.
        Returns best move and evaluation.
        """
        self._nodes = 0
        self._stop = False
        self._deadline = time.perf_counter() + time_limit_ms / 1000.0
        self._killers = [[None, None] for _ in range(MAX_PLY)]
        self._history = {}
        self._tt.new_search()

        best_result = SearchResult(None, 0, 0, 0, 0.0, [])
        score = 0
        start = time.perf_counter()

        for depth in range(1, max_depth + 1):
            if self._stop:
                break

            if depth >= 5:
                # Aspiration windows
                alpha = score - ASPIRATION_WINDOW
                beta = score + ASPIRATION_WINDOW
                while True:
                    score = self._pvs(board, depth, alpha, beta, 0)
                    if self._stop:
                        break
                    if score <= alpha:
                        alpha -= ASPIRATION_WINDOW
                    elif score >= beta:
                        beta += ASPIRATION_WINDOW
                    else:
                        break
            else:
                score = self._pvs(board, depth, -INFINITY, INFINITY, 0)

            if self._stop:
                break

            elapsed = (time.perf_counter() - start) * 1000
            pv = self._extract_pv(board, depth)
            best_move = pv[0] if pv else None
            best_result = SearchResult(best_move, score, depth,
                                       self._nodes, elapsed, pv)

        return best_result

    def _time_ok(self) -> bool:
        if self._stop:
            return False
        if time.perf_counter() > self._deadline:
            self._stop = True
            return False
        return True

    def _pvs(self, board: chess.Board, depth: int, alpha: int, beta: int,
             ply: int, null_allowed: bool = True) -> int:
        self._nodes += 1
        self._pv_length[ply] = ply

        if not self._time_ok():
            return 0

        # Draw detection
        if ply > 0 and (board.is_repetition(2) or board.is_fifty_moves()):
            return DRAW_SCORE

        # Mate distance pruning
        alpha = max(alpha, -MATE_SCORE + ply)
        beta = min(beta, MATE_SCORE - ply)
        if alpha >= beta:
            return alpha

        is_pv = (beta - alpha) > 1
        in_check = board.is_check()
        key = self._hasher.compute(board)

        # Transposition table lookup
        tt_entry = self._tt.probe(key)
        if tt_entry and tt_entry.depth >= depth and not is_pv:
            if tt_entry.flag == NodeType.EXACT:
                return tt_entry.score
            if tt_entry.flag == NodeType.LOWER_BOUND:
                alpha = max(alpha, tt_entry.score)
            elif tt_entry.flag == NodeType.UPPER_BOUND:
                beta = min(beta, tt_entry.score)
            if alpha >= beta:
                return tt_entry.score

        # Quiescence at leaf
        if depth <= 0:
            return self._quiescence(board, alpha, beta, ply)

        static_eval = self._eval.evaluate(board)

        # Null move pruning
        if (null_allowed and not in_check and depth >= NULL_MOVE_REDUCTION + 1
                and not board.is_variant_end()
                and static_eval >= beta
                and self._has_non_pawn_material(board)):
            board.push(chess.Move.null())
            null_score = -self._pvs(board, depth - 1 - NULL_MOVE_REDUCTION,
                                    -beta, -beta + 1, ply + 1, False)
            board.pop()
            if not self._stop and null_score >= beta:
                return null_score

        # Futility pruning (not at PV nodes)
        futility_prune = (not is_pv and not in_check
                          and depth < len(FUTILITY_MARGIN)
                          and static_eval + FUTILITY_MARGIN[depth] <= alpha)

        best_move: Optional[chess.Move] = None
        best_score = -INFINITY
        moves_searched = 0
        original_alpha = alpha

        ordered_moves = self._order_moves(board, tt_entry.best_move if tt_entry else None, ply)

        for move in ordered_moves:
            if not self._time_ok():
                break

            is_capture = board.is_capture(move)
            is_promotion = move.promotion is not None
            gives_check = board.gives_check(move)

            # Futility pruning
            if (futility_prune and moves_searched > 0
                    and not is_capture and not is_promotion and not gives_check):
                continue

            board.push(move)
            moves_searched += 1

            # Late Move Reductions
            reduction = 0
            if (not in_check and not gives_check and not is_capture
                    and not is_promotion and moves_searched >= LMR_MIN_MOVES
                    and depth >= LMR_MIN_DEPTH):
                reduction = max(1, int(0.6 + 0.4 * (moves_searched - LMR_MIN_MOVES) ** 0.5))

            if moves_searched == 1:
                score = -self._pvs(board, depth - 1, -beta, -alpha, ply + 1)
            else:
                # PVS zero-window with LMR
                score = -self._pvs(board, depth - 1 - reduction, -alpha - 1, -alpha, ply + 1)
                if not self._stop and score > alpha and score < beta:
                    score = -self._pvs(board, depth - 1, -beta, -alpha, ply + 1)

            board.pop()

            if self._stop:
                break

            if score > best_score:
                best_score = score
                best_move = move
                if score > alpha:
                    alpha = score
                    self._pv_table[ply][ply] = move
                    for next_ply in range(ply + 1, self._pv_length[ply + 1]):
                        self._pv_table[ply][next_ply] = self._pv_table[ply + 1][next_ply]
                    self._pv_length[ply] = self._pv_length[ply + 1]

            if alpha >= beta:
                # Killer and history heuristics
                if not is_capture:
                    self._store_killer(move, ply)
                    key_h = (board.piece_at(move.from_square), move.to_square)
                    self._history[key_h] = self._history.get(key_h, 0) + depth * depth
                break

        if moves_searched == 0:
            return -MATE_SCORE + ply if in_check else DRAW_SCORE

        flag = (NodeType.EXACT if original_alpha < alpha < beta
                else NodeType.UPPER_BOUND if alpha <= original_alpha
                else NodeType.LOWER_BOUND)
        self._tt.store(key, depth, best_score, flag, best_move)

        return best_score

    def _quiescence(self, board: chess.Board, alpha: int, beta: int, ply: int) -> int:
        self._nodes += 1
        if not self._time_ok():
            return 0

        stand_pat = self._eval.evaluate(board)
        if stand_pat >= beta:
            return beta
        if stand_pat > alpha:
            alpha = stand_pat

        for move in self._order_captures(board):
            board.push(move)
            score = -self._quiescence(board, -beta, -alpha, ply + 1)
            board.pop()
            if score >= beta:
                return beta
            if score > alpha:
                alpha = score
        return alpha

    def _order_moves(self, board: chess.Board,
                     tt_move: Optional[chess.Move], ply: int) -> list[chess.Move]:
        scored: list[tuple[int, chess.Move]] = []
        killer1 = self._killers[ply][0]
        killer2 = self._killers[ply][1]

        for move in board.legal_moves:
            score = 0
            if move == tt_move:
                score = 100_000
            elif board.is_capture(move):
                victim = board.piece_at(move.to_square)
                attacker = board.piece_at(move.from_square)
                if victim and attacker:
                    from core.evaluator import MATERIAL
                    score = 10_000 + MATERIAL[victim.piece_type] - MATERIAL[attacker.piece_type] // 10
                else:
                    score = 9_000
            elif move.promotion:
                score = 9_500
            elif move == killer1:
                score = 8_000
            elif move == killer2:
                score = 7_000
            else:
                piece = board.piece_at(move.from_square)
                score = self._history.get((piece, move.to_square), 0)
            scored.append((-score, move))

        scored.sort(key=lambda x: x[0])
        return [m for _, m in scored]

    def _order_captures(self, board: chess.Board) -> list[chess.Move]:
        from core.evaluator import MATERIAL
        scored: list[tuple[int, chess.Move]] = []
        for move in board.generate_pseudo_legal_captures():
            if not board.is_legal(move):
                continue
            victim = board.piece_at(move.to_square)
            attacker = board.piece_at(move.from_square)
            if victim and attacker:
                gain = MATERIAL[victim.piece_type] - MATERIAL[attacker.piece_type] // 10
            else:
                gain = 0
            scored.append((-gain, move))
        scored.sort(key=lambda x: x[0])
        return [m for _, m in scored]

    def _store_killer(self, move: chess.Move, ply: int):
        if move != self._killers[ply][0]:
            self._killers[ply][1] = self._killers[ply][0]
            self._killers[ply][0] = move

    def _has_non_pawn_material(self, board: chess.Board) -> bool:
        color = board.turn
        for pt in [chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN]:
            if board.pieces(pt, color):
                return True
        return False

    def _extract_pv(self, board: chess.Board, depth: int) -> list[chess.Move]:
        pv: list[chess.Move] = []
        temp_board = board.copy()
        seen_keys: set[int] = set()
        for i in range(min(depth, self._pv_length[0])):
            move = self._pv_table[0][i]
            if move is None:
                break
            if move not in temp_board.legal_moves:
                break
            key = self._hasher.compute(temp_board)
            if key in seen_keys:
                break
            seen_keys.add(key)
            pv.append(move)
            temp_board.push(move)
        return pv
