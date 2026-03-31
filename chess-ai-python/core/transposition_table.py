"""
Transposition Table for chess search memoization.
Uses Zobrist hashing with LRU eviction for bounded memory usage.
"""
from __future__ import annotations
import random
from enum import IntEnum
from dataclasses import dataclass
from typing import Optional
import chess


class NodeType(IntEnum):
    EXACT = 0       # Exact score
    LOWER_BOUND = 1 # Alpha cut-off (fail-high)
    UPPER_BOUND = 2 # Beta cut-off (fail-low)


@dataclass
class TTEntry:
    key: int
    depth: int
    score: int
    flag: NodeType
    best_move: Optional[chess.Move]
    age: int


class ZobristHasher:
    """
    Incremental Zobrist hashing for fast position identification.
    Fully compatible with python-chess board state.
    """
    def __init__(self):
        rng = random.Random(20240101)
        self.piece_square = [
            [rng.getrandbits(64) for _ in range(64)]
            for _ in range(12)
        ]
        self.side_to_move = rng.getrandbits(64)
        self.castling_rights = [rng.getrandbits(64) for _ in range(16)]
        self.en_passant_file = [rng.getrandbits(64) for _ in range(8)]

    def _piece_index(self, piece: chess.Piece) -> int:
        return (piece.piece_type - 1) + (6 if piece.color == chess.BLACK else 0)

    def compute(self, board: chess.Board) -> int:
        h = 0
        for sq, piece in board.piece_map().items():
            h ^= self.piece_square[self._piece_index(piece)][sq]
        if board.turn == chess.BLACK:
            h ^= self.side_to_move
        cr = board.castling_rights & 15
        h ^= self.castling_rights[cr]
        if board.ep_square is not None:
            h ^= self.en_passant_file[chess.square_file(board.ep_square)]
        return h


class TranspositionTable:
    """
    Fixed-size transposition table with generational aging and replacement strategy.
    Entries: always-replace if depth is better, else keep deeper.
    """
    def __init__(self, size_mb: int = 64):
        self._num_entries = (size_mb * 1024 * 1024) // 40
        self._table: dict[int, TTEntry] = {}
        self._generation = 0
        self.hasher = ZobristHasher()
        self.hits = 0
        self.misses = 0

    def new_search(self):
        self._generation += 1

    def probe(self, key: int) -> Optional[TTEntry]:
        entry = self._table.get(key)
        if entry and entry.key == key:
            self.hits += 1
            return entry
        self.misses += 1
        return None

    def store(self, key: int, depth: int, score: int, flag: NodeType,
              best_move: Optional[chess.Move]):
        existing = self._table.get(key)
        if existing and existing.depth > depth and existing.age == self._generation:
            return
        if len(self._table) >= self._num_entries:
            oldest = min(self._table.values(), key=lambda e: (e.age, e.depth))
            del self._table[oldest.key]
        self._table[key] = TTEntry(key, depth, score, flag, best_move, self._generation)

    def clear(self):
        self._table.clear()
        self._generation = 0
        self.hits = 0
        self.misses = 0

    @property
    def usage_percent(self) -> float:
        return len(self._table) / self._num_entries * 100
