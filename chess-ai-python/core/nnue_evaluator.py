"""
NNUE-style Neural Network Evaluator.
Architecture: HalfKA(768) → 256 → 32 → 1
Uses the same interface as Evaluator so it can drop in as a replacement.

Training: use train_nnue.py (self-play positions labeled by classical eval).
Inference: forward pass is pure NumPy for maximum portability.
"""
from __future__ import annotations
import os
import struct
from typing import Optional
import numpy as np
import chess
from core.evaluator import Evaluator, MATE_SCORE, DRAW_SCORE

FEATURE_SIZE = 768    # 12 pieces × 64 squares
HIDDEN1      = 256
HIDDEN2      = 32
OUTPUT       = 1
SCALE        = 400    # centipawn output scale


def _clamp(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 0.0, 1.0)


def _crelu(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 0.0, 1.0)


class NNUENetwork:
    """
    3-layer fully connected net with CReLU activations.
    Weights stored as float32 arrays.
    """
    def __init__(self):
        self.w1 = np.zeros((FEATURE_SIZE, HIDDEN1), dtype=np.float32)
        self.b1 = np.zeros(HIDDEN1, dtype=np.float32)
        self.w2 = np.zeros((HIDDEN1, HIDDEN2),  dtype=np.float32)
        self.b2 = np.zeros(HIDDEN2, dtype=np.float32)
        self.w3 = np.zeros((HIDDEN2, OUTPUT),   dtype=np.float32)
        self.b3 = np.zeros(OUTPUT,   dtype=np.float32)
        self._initialized = False

    def randomize(self, seed: int = 42):
        """Initialize with He-normal weights — used for first-time training."""
        rng = np.random.RandomState(seed)
        self.w1 = (rng.randn(FEATURE_SIZE, HIDDEN1) * np.sqrt(2.0 / FEATURE_SIZE)).astype(np.float32)
        self.b1 = np.zeros(HIDDEN1, dtype=np.float32)
        self.w2 = (rng.randn(HIDDEN1, HIDDEN2) * np.sqrt(2.0 / HIDDEN1)).astype(np.float32)
        self.b2 = np.zeros(HIDDEN2, dtype=np.float32)
        self.w3 = (rng.randn(HIDDEN2, OUTPUT) * np.sqrt(2.0 / HIDDEN2)).astype(np.float32)
        self.b3 = np.zeros(OUTPUT, dtype=np.float32)
        self._initialized = True

    def forward(self, features: np.ndarray) -> float:
        """Forward pass. features: (768,) binary float32 array."""
        h1 = _crelu(features @ self.w1 + self.b1)
        h2 = _crelu(h1 @ self.w2 + self.b2)
        out = h2 @ self.w3 + self.b3
        return float(out[0]) * SCALE

    def save(self, path: str):
        with open(path, "wb") as f:
            for arr in [self.w1, self.b1, self.w2, self.b2, self.w3, self.b3]:
                f.write(struct.pack("<I", arr.nbytes))
                f.write(arr.tobytes())

    def load(self, path: str):
        with open(path, "rb") as f:
            def read_arr(shape):
                nbytes = struct.unpack("<I", f.read(4))[0]
                data = f.read(nbytes)
                return np.frombuffer(data, dtype=np.float32).copy().reshape(shape)
            self.w1 = read_arr((FEATURE_SIZE, HIDDEN1))
            self.b1 = read_arr((HIDDEN1,))
            self.w2 = read_arr((HIDDEN1, HIDDEN2))
            self.b2 = read_arr((HIDDEN2,))
            self.w3 = read_arr((HIDDEN2, OUTPUT))
            self.b3 = read_arr((OUTPUT,))
        self._initialized = True


class FeatureExtractor:
    """
    HalfKA feature extractor: encodes board state as a 768-dim binary vector.
    Index = piece_type_index(0..11) * 64 + square(0..63)
    Piece order: WP WN WB WR WQ WK BP BN BB BR BQ BK
    """
    _PIECE_INDEX: dict[tuple, int] = {}

    def __init__(self):
        self._build_index()

    def _build_index(self):
        for i, (color, pt) in enumerate([
            (chess.WHITE, chess.PAWN),
            (chess.WHITE, chess.KNIGHT),
            (chess.WHITE, chess.BISHOP),
            (chess.WHITE, chess.ROOK),
            (chess.WHITE, chess.QUEEN),
            (chess.WHITE, chess.KING),
            (chess.BLACK, chess.PAWN),
            (chess.BLACK, chess.KNIGHT),
            (chess.BLACK, chess.BISHOP),
            (chess.BLACK, chess.ROOK),
            (chess.BLACK, chess.QUEEN),
            (chess.BLACK, chess.KING),
        ]):
            self._PIECE_INDEX[(color, pt)] = i

    def extract(self, board: chess.Board) -> np.ndarray:
        features = np.zeros(FEATURE_SIZE, dtype=np.float32)
        for sq, piece in board.piece_map().items():
            idx = self._PIECE_INDEX.get((piece.color, piece.piece_type))
            if idx is not None:
                features[idx * 64 + sq] = 1.0
        if board.turn == chess.BLACK:
            features = self._flip_features(features)
        return features

    def _flip_features(self, features: np.ndarray) -> np.ndarray:
        flipped = np.zeros_like(features)
        for i in range(12):
            src = features[i * 64:(i + 1) * 64]
            mirror_i = (i + 6) % 12
            dst_start = mirror_i * 64
            for sq in range(64):
                flipped[dst_start + (sq ^ 56)] = src[sq]
        return flipped


class NNUEEvaluator(Evaluator):
    """
    Drop-in replacement for Evaluator that uses the NNUE network when a
    trained weights file is present, and falls back to classical eval otherwise.

    Weight file path: data/nnue/weights.nnue
    """
    _MODEL_PATH = os.path.join("data", "nnue", "weights.nnue")

    def __init__(self):
        super().__init__()
        self._net = NNUENetwork()
        self._extractor = FeatureExtractor()
        self._use_nnue = self._try_load()
        self._blend_ratio = 0.7 if self._use_nnue else 0.0

    def _try_load(self) -> bool:
        if os.path.exists(self._MODEL_PATH):
            try:
                self._net.load(self._MODEL_PATH)
                return True
            except Exception:
                pass
        self._net.randomize(seed=20240101)
        return False

    def evaluate(self, board: chess.Board) -> int:
        if board.is_checkmate():
            return -MATE_SCORE
        if (board.is_stalemate() or board.is_insufficient_material()
                or board.is_seventyfive_moves() or board.is_fivefold_repetition()):
            return DRAW_SCORE

        classical = super().evaluate(board)

        if not self._use_nnue or self._blend_ratio == 0.0:
            return classical

        features = self._extractor.extract(board)
        nnue_score = int(self._net.forward(features))
        blended = int(self._blend_ratio * nnue_score +
                      (1.0 - self._blend_ratio) * classical)
        return blended

    @property
    def is_nnue_active(self) -> bool:
        return self._use_nnue

    def save_weights(self, path: Optional[str] = None):
        target = path or self._MODEL_PATH
        os.makedirs(os.path.dirname(target), exist_ok=True)
        self._net.save(target)

    def generate_training_data(self, board: chess.Board,
                                result: float) -> tuple[np.ndarray, float]:
        """
        Generate a (features, target) training sample.
        result: 1.0 = white win, 0.5 = draw, 0.0 = black win
        """
        features = self._extractor.extract(board)
        classical_cp = super().evaluate(board) / 100.0
        target = classical_cp
        return features, target
