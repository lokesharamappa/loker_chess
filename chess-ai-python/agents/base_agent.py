"""
Abstract base class for all chess AI agents.
Defines the contract every agent must fulfill.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
import chess


@dataclass
class AgentConfig:
    name: str
    elo_strength: int = 2800
    max_depth: int = 20
    time_limit_ms: float = 5000.0
    use_opening_book: bool = True
    use_endgame_tb: bool = True
    contempt: int = 0


@dataclass
class AgentDecision:
    move: chess.Move
    score: int
    depth: int
    nodes: int
    time_ms: float
    pv: list[chess.Move] = field(default_factory=list)
    source: str = "search"
    annotation: str = ""

    def uci(self) -> str:
        return self.move.uci()

    def score_str(self) -> str:
        if abs(self.score) > 90_000:
            mate_in = (100_000 - abs(self.score) + 1) // 2
            sign = "+" if self.score > 0 else "-"
            return f"#{sign}{mate_in}"
        cp = self.score / 100.0
        return f"{cp:+.2f}"


class BaseAgent(ABC):
    """
    Base agent interface. Every concrete agent selects a move
    given a board position and optional constraints.
    """
    def __init__(self, config: AgentConfig):
        self.config = config
        self._name = config.name

    @property
    def name(self) -> str:
        return self._name

    @abstractmethod
    def can_handle(self, board: chess.Board) -> bool:
        """Return True if this agent can produce a move for the given position."""

    @abstractmethod
    def select_move(self, board: chess.Board,
                    time_limit_ms: Optional[float] = None) -> Optional[AgentDecision]:
        """
        Select best move for current position.
        Returns None if agent cannot handle this position.
        """

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name={self._name}, elo={self.config.elo_strength})"
