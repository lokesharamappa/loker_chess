"""
Search Agent — wraps the Alpha-Beta PVS engine with configurable
strength levels from 800 ELO (beginner) to 3200 ELO (super-GM).
Strength is modulated via depth, time, and randomization.
"""
from __future__ import annotations
import time
import random
import math
from typing import Optional
import chess

from agents.base_agent import BaseAgent, AgentConfig, AgentDecision
from core.evaluator import Evaluator, MATE_SCORE
from core.search import AlphaBetaSearch
from core.transposition_table import TranspositionTable


STRENGTH_PROFILES: dict[str, dict] = {
    "beginner":    {"elo": 800,  "depth": 2,  "time_ms": 100,   "random_pct": 0.40},
    "novice":      {"elo": 1200, "depth": 4,  "time_ms": 300,   "random_pct": 0.20},
    "intermediate":{"elo": 1600, "depth": 6,  "time_ms": 1000,  "random_pct": 0.08},
    "advanced":    {"elo": 2000, "depth": 10, "time_ms": 2000,  "random_pct": 0.03},
    "expert":      {"elo": 2400, "depth": 14, "time_ms": 3000,  "random_pct": 0.01},
    "master":      {"elo": 2600, "depth": 18, "time_ms": 5000,  "random_pct": 0.005},
    "grandmaster": {"elo": 2800, "depth": 22, "time_ms": 8000,  "random_pct": 0.001},
    "super_gm":    {"elo": 3200, "depth": 30, "time_ms": 15000, "random_pct": 0.0},
}


class SearchAgent(BaseAgent):
    """
    Full Alpha-Beta search agent with configurable strength.
    Always returns a legal move for any non-terminal position.
    """

    def __init__(self, config: AgentConfig, strength: str = "grandmaster",
                 tt_size_mb: int = 64):
        super().__init__(config)
        profile = STRENGTH_PROFILES.get(strength, STRENGTH_PROFILES["grandmaster"])
        self._strength = strength
        self._max_depth = config.max_depth or profile["depth"]
        self._default_time_ms = config.time_limit_ms or profile["time_ms"]
        self._random_pct = profile["random_pct"]

        self._evaluator = Evaluator()
        self._tt = TranspositionTable(size_mb=tt_size_mb)
        self._engine = AlphaBetaSearch(self._tt, self._evaluator)

    def can_handle(self, board: chess.Board) -> bool:
        return not board.is_game_over()

    def select_move(self, board: chess.Board,
                    time_limit_ms: Optional[float] = None) -> Optional[AgentDecision]:
        if not self.can_handle(board):
            return None

        moves = list(board.legal_moves)
        if not moves:
            return None
        if len(moves) == 1:
            return AgentDecision(
                move=moves[0], score=0, depth=0, nodes=1,
                time_ms=0.0, pv=[moves[0]], source="forced",
                annotation="Only legal move"
            )

        # Inject controlled randomness for lower-strength levels
        if self._random_pct > 0 and random.random() < self._random_pct:
            return self._random_move(board, moves)

        time_ms = time_limit_ms or self._default_time_ms
        result = self._engine.search(board, self._max_depth, time_ms)

        if result.move is None or result.move not in board.legal_moves:
            return self._random_move(board, moves)

        # Add contempt for draws (prefer fighting for a win)
        score = result.score + self.config.contempt

        return AgentDecision(
            move=result.move,
            score=score,
            depth=result.depth,
            nodes=result.nodes,
            time_ms=result.time_ms,
            pv=result.pv,
            source=f"search_d{result.depth}",
            annotation=(f"depth={result.depth} nodes={result.nodes:,} "
                        f"tt_hit={self._tt.hits:,} "
                        f"tt_usage={self._tt.usage_percent:.1f}%"),
        )

    def _random_move(self, board: chess.Board,
                     moves: list[chess.Move]) -> AgentDecision:
        """Select a random legal move (used for strength handicapping)."""
        move = random.choice(moves)
        return AgentDecision(
            move=move, score=0, depth=0, nodes=1,
            time_ms=0.0, pv=[move], source="random",
            annotation="Random move (strength mode)"
        )

    def set_strength(self, strength: str):
        profile = STRENGTH_PROFILES.get(strength)
        if not profile:
            raise ValueError(f"Unknown strength level: {strength}. "
                             f"Valid: {list(STRENGTH_PROFILES.keys())}")
        self._strength = strength
        self._max_depth = profile["depth"]
        self._default_time_ms = profile["time_ms"]
        self._random_pct = profile["random_pct"]

    def set_elo_strength(self, elo: int):
        """Set strength to closest ELO profile."""
        best = min(STRENGTH_PROFILES.items(),
                   key=lambda kv: abs(kv[1]["elo"] - elo))
        self.set_strength(best[0])

    def get_evaluation(self, board: chess.Board) -> int:
        """Get static evaluation of position (centipawns, side-to-move positive)."""
        return self._evaluator.evaluate(board)

    def clear_tt(self):
        self._tt.clear()

    @property
    def strength(self) -> str:
        return self._strength

    @property
    def tt_stats(self) -> dict:
        return {
            "hits": self._tt.hits,
            "misses": self._tt.misses,
            "usage_pct": round(self._tt.usage_percent, 2),
        }
