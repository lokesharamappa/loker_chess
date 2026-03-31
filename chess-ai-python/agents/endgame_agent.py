"""
Endgame Agent — uses Syzygy tablebases for perfect endgame play
(up to 7 pieces). Falls back to search agent when TB unavailable.
"""
from __future__ import annotations
from pathlib import Path
from typing import Optional
import chess
import chess.syzygy

from agents.base_agent import BaseAgent, AgentConfig, AgentDecision

TABLEBASE_SEARCH_PATHS = [
    Path("data/syzygy/3-4-5"),
    Path("data/syzygy"),
    Path("/usr/share/syzygy"),
]

MAX_TB_PIECES = 7


class EndgameAgent(BaseAgent):
    """
    Uses Syzygy tablebases for provably optimal endgame play.
    Selects the move that wins fastest (minimizes DTZ) or draws longest.
    """

    def __init__(self, config: AgentConfig, tb_path: Optional[Path] = None):
        super().__init__(config)
        self._tablebase: Optional[chess.syzygy.Tablebase] = None
        self._tb_path = tb_path
        self._load_tablebase(tb_path)

    def _load_tablebase(self, path: Optional[Path]):
        candidates = [path] + TABLEBASE_SEARCH_PATHS if path else TABLEBASE_SEARCH_PATHS
        for candidate in candidates:
            if candidate and candidate.exists():
                try:
                    self._tablebase = chess.syzygy.open_tablebase(str(candidate))
                    self._tb_path = candidate
                    return
                except Exception:
                    continue
        self._tablebase = None

    def can_handle(self, board: chess.Board) -> bool:
        if board.is_game_over():
            return False
        piece_count = chess.popcount(board.occupied)
        if piece_count > MAX_TB_PIECES:
            return False
        if self._tablebase is None:
            return False
        try:
            self._tablebase.get_dtz(board)
            return True
        except (KeyError, chess.syzygy.MissingTableError):
            return False

    def select_move(self, board: chess.Board,
                    time_limit_ms: Optional[float] = None) -> Optional[AgentDecision]:
        if not self.can_handle(board):
            return None

        try:
            best_move = None
            best_dtz = None

            for move in board.legal_moves:
                board.push(move)
                try:
                    dtz = self._tablebase.get_dtz(board)
                except (KeyError, chess.syzygy.MissingTableError):
                    board.pop()
                    continue

                # We want to maximize our advantage:
                # Winning: pick move with smallest abs(dtz) for fastest win
                # Losing: pick move with largest abs(dtz) to delay loss
                # Drawing: any draw move is fine
                if dtz is None:
                    board.pop()
                    continue

                if best_dtz is None:
                    best_dtz = dtz
                    best_move = move
                else:
                    # Flip sign because we pushed the move (now opponent's turn)
                    # Negative dtz means the position after move is a loss for the mover
                    # (which is a WIN for us). We want the most negative dtz for the opponent.
                    if -dtz < -best_dtz:
                        best_dtz = dtz
                        best_move = move
                board.pop()

            if best_move is None:
                return None

            score = self._dtz_to_score(best_dtz)
            outcome = self._classify_outcome(best_dtz)
            return AgentDecision(
                move=best_move,
                score=score,
                depth=0,
                nodes=0,
                time_ms=0.0,
                pv=[best_move],
                source="tablebase",
                annotation=f"TB: {outcome}, DTZ={best_dtz}",
            )

        except Exception:
            return None

    def get_wdl(self, board: chess.Board) -> Optional[str]:
        """Get Win/Draw/Loss classification for the current position."""
        if self._tablebase is None:
            return None
        try:
            dtz = self._tablebase.get_dtz(board)
            return self._classify_outcome(dtz)
        except Exception:
            return None

    def _dtz_to_score(self, dtz: Optional[int]) -> int:
        if dtz is None:
            return 0
        if dtz < 0:
            return 90_000 + dtz
        if dtz > 0:
            return -(90_000 - dtz)
        return 0

    def _classify_outcome(self, dtz: Optional[int]) -> str:
        if dtz is None:
            return "unknown"
        if dtz > 0:
            return f"Loss in {abs(dtz)}"
        if dtz < 0:
            return f"Win in {abs(dtz)}"
        return "Draw"

    def close(self):
        if self._tablebase:
            self._tablebase.close()
            self._tablebase = None
