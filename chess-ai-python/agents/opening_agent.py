"""
Opening Agent — reads Polyglot opening books (.bin) and selects
moves weighted by relative frequency (professional repertoire).
Falls back gracefully if no book is available.
"""
from __future__ import annotations
import os
import random
import struct
from pathlib import Path
from typing import Optional
import chess
import chess.polyglot

from agents.base_agent import BaseAgent, AgentConfig, AgentDecision

BOOK_SEARCH_PATHS = [
    Path("data/books/gm2600.bin"),
    Path("data/books/komodo.bin"),
    Path("data/books/performance.bin"),
    Path("data/books/book.bin"),
]


class OpeningAgent(BaseAgent):
    """
    Agent that plays from a Polyglot opening book.
    Uses weighted random selection proportional to move weight
    (higher weight = played more often by strong players).
    """

    def __init__(self, config: AgentConfig, book_path: Optional[Path] = None):
        super().__init__(config)
        self._reader: Optional[chess.polyglot.MemoryMappedReader] = None
        self._book_path = book_path
        self._load_book(book_path)
        self._move_count_threshold = 20

    def _load_book(self, path: Optional[Path]):
        candidates = [path] + BOOK_SEARCH_PATHS if path else BOOK_SEARCH_PATHS
        for candidate in candidates:
            if candidate and candidate.exists():
                try:
                    self._reader = chess.polyglot.open_reader(str(candidate))
                    self._book_path = candidate
                    return
                except Exception:
                    continue
        self._reader = None

    def can_handle(self, board: chess.Board) -> bool:
        if self._reader is None:
            return False
        if board.fullmove_number > self._move_count_threshold:
            return False
        try:
            entries = list(self._reader.find_all(board))
            return len(entries) > 0
        except Exception:
            return False

    def select_move(self, board: chess.Board,
                    time_limit_ms: Optional[float] = None) -> Optional[AgentDecision]:
        if not self.can_handle(board):
            return None
        try:
            entries = list(self._reader.find_all(board))
            if not entries:
                return None
            total_weight = sum(e.weight for e in entries)
            if total_weight == 0:
                entry = random.choice(entries)
            else:
                r = random.randint(0, total_weight - 1)
                cumulative = 0
                entry = entries[-1]
                for e in sorted(entries, key=lambda x: -x.weight):
                    cumulative += e.weight
                    if cumulative > r:
                        entry = e
                        break
            move = entry.move
            if move not in board.legal_moves:
                return None
            weight_pct = (entry.weight / total_weight * 100) if total_weight > 0 else 0
            annotation = (f"Book: {len(entries)} candidates, "
                          f"played {weight_pct:.0f}% of the time")
            return AgentDecision(
                move=move,
                score=0,
                depth=0,
                nodes=0,
                time_ms=0.0,
                pv=[move],
                source="opening_book",
                annotation=annotation,
            )
        except Exception:
            return None

    def get_all_book_moves(self, board: chess.Board) -> list[dict]:
        """Returns all book moves with their weights for analysis UI."""
        if self._reader is None:
            return []
        try:
            entries = list(self._reader.find_all(board))
            total = sum(e.weight for e in entries)
            result = []
            for e in sorted(entries, key=lambda x: -x.weight):
                result.append({
                    "move": e.move.uci(),
                    "weight": e.weight,
                    "frequency": round(e.weight / total * 100, 1) if total > 0 else 0,
                })
            return result
        except Exception:
            return []

    def close(self):
        if self._reader:
            self._reader.close()
            self._reader = None
