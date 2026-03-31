"""
Game Annotation Service — classifies move quality and generates
PGN annotations with engine evaluations for every move.

Move quality scale (matches Lichess/Chess.com symbols):
  !!  Brilliant      eval jump > +200cp (unexpected strong sacrifice)
  !   Good           best or near-best move
  !?  Interesting    playable but unusual
  ?!  Inaccuracy     −50 to −100 cp loss
  ?   Mistake        −100 to −300 cp loss
  ??  Blunder        > −300 cp loss
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
import chess
import chess.pgn

from core.evaluator import Evaluator, MATE_SCORE
from core.search import AlphaBetaSearch
from core.transposition_table import TranspositionTable
from agents.base_agent import AgentConfig
from agents.search_agent import SearchAgent


@dataclass
class MoveAnnotation:
    move_number: int
    uci: str
    san: str
    eval_cp: Optional[int]
    eval_mate: Optional[int]
    best_move_uci: Optional[str]
    best_eval_cp: Optional[int]
    delta_cp: Optional[int]
    quality: str
    quality_symbol: str
    comment: str


QUALITY_THRESHOLDS = [
    ("blunder",     -300, "??"),
    ("mistake",     -100, "?"),
    ("inaccuracy",   -50, "?!"),
    ("interesting",    0, "!?"),
    ("good",          50, "!"),
    ("brilliant",    200, "!!"),
    ("best",       10000, ""),
]


def _score_to_cp(score: int) -> Optional[int]:
    if abs(score) > 90_000:
        return None
    return score


def _score_to_mate(score: int) -> Optional[int]:
    if abs(score) > 90_000:
        mate_in = (100_000 - abs(score) + 1) // 2
        return mate_in if score > 0 else -mate_in
    return None


def classify_quality(delta: Optional[int]) -> tuple[str, str]:
    if delta is None:
        return "book", ""
    for quality, threshold, symbol in QUALITY_THRESHOLDS:
        if delta >= threshold:
            continue
        if delta <= -300:
            return "blunder", "??"
        if delta <= -100:
            return "mistake", "?"
        if delta <= -50:
            return "inaccuracy", "?!"
    if delta >= 200:
        return "brilliant", "!!"
    if delta >= 50:
        return "good", "!"
    if delta >= 0:
        return "best", ""
    return "interesting", "!?"


class GameAnnotator:
    """
    Annotates every move in a chess game with engine evaluation and quality.
    Uses a fast shallow search (depth 14) for speed; configurable.
    """

    def __init__(self, depth: int = 14, time_per_move_ms: float = 1000.0):
        self._depth = depth
        self._time_ms = time_per_move_ms
        cfg = AgentConfig(name="annotator", max_depth=depth, time_limit_ms=time_per_move_ms)
        self._agent = SearchAgent(cfg, strength="expert", tt_size_mb=32)

    def annotate_game(self, pgn_text: str) -> tuple[list[MoveAnnotation], str]:
        """
        Parse PGN and annotate each move.
        Returns (annotations_list, annotated_pgn_string).
        """
        import io
        game = chess.pgn.read_game(io.StringIO(pgn_text))
        if not game:
            return [], pgn_text
        return self._annotate(game)

    def annotate_board_sequence(self, moves_uci: list[str]) -> list[MoveAnnotation]:
        """Annotate a list of UCI moves from the starting position."""
        board = chess.Board()
        game = chess.pgn.Game()
        node = game
        for uci in moves_uci:
            move = chess.Move.from_uci(uci)
            if move in board.legal_moves:
                node = node.add_variation(move)
                board.push(move)
        annotations, _ = self._annotate(game)
        return annotations

    def _annotate(self, game: chess.pgn.Game) -> tuple[list[MoveAnnotation], str]:
        annotations: list[MoveAnnotation] = []
        board = game.board()
        node = game
        move_num = 0

        prev_eval: Optional[int] = None

        for move in game.mainline_moves():
            move_num += 1
            san = board.san(move)

            # Evaluate BEFORE the move (position for the mover)
            before_decision = self._agent.select_move(board, self._time_ms)
            before_score = before_decision.score if before_decision else 0
            best_move = before_decision.move if before_decision else None

            board.push(move)

            # Evaluate AFTER the move (negate because perspective flips)
            after_decision = self._agent.select_move(board, self._time_ms)
            after_score = -(after_decision.score if after_decision else 0)

            # delta: how much did this move cost vs the best move?
            delta: Optional[int] = None
            if before_score is not None and after_score is not None:
                delta = after_score - before_score

            quality, symbol = classify_quality(delta)

            eval_cp = _score_to_cp(after_score) if after_score else None
            eval_mate = _score_to_mate(after_score) if after_score else None
            best_cp = _score_to_cp(before_score) if before_score else None

            comment = self._build_comment(eval_cp, eval_mate, delta, quality, best_move, move)

            ann = MoveAnnotation(
                move_number=move_num,
                uci=move.uci(),
                san=san,
                eval_cp=eval_cp,
                eval_mate=eval_mate,
                best_move_uci=best_move.uci() if best_move else None,
                best_eval_cp=best_cp,
                delta_cp=delta,
                quality=quality,
                quality_symbol=symbol,
                comment=comment,
            )
            annotations.append(ann)

            if node.variations:
                child = node.variations[0]
                child.comment = comment
                if symbol:
                    child.nags = {self._symbol_to_nag(symbol)}
            node = node.variations[0] if node.variations else node

        exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=True)
        annotated_pgn = game.accept(exporter)
        return annotations, annotated_pgn

    def _build_comment(self, eval_cp: Optional[int], eval_mate: Optional[int],
                        delta: Optional[int], quality: str,
                        best_move: Optional[chess.Move],
                        played_move: chess.Move) -> str:
        parts = []
        if eval_mate is not None:
            parts.append(f"[%eval #{eval_mate}]")
        elif eval_cp is not None:
            parts.append(f"[%eval {eval_cp / 100:.2f}]")
        if quality in ("blunder", "mistake", "inaccuracy") and best_move and best_move != played_move:
            parts.append(f"Better: {best_move.uci()}")
        if delta is not None and abs(delta) > 50:
            sign = "+" if delta >= 0 else ""
            parts.append(f"({sign}{delta / 100:.2f})")
        return " ".join(parts)

    @staticmethod
    def _symbol_to_nag(symbol: str) -> int:
        return {"!!": 3, "!": 1, "!?": 5, "?!": 6, "?": 2, "??": 4}.get(symbol, 0)

    def classify_moves(self, annotations: list[MoveAnnotation]) -> dict:
        """Return summary statistics for a game's move quality."""
        counts = {q: 0 for q in ["brilliant", "good", "best", "interesting",
                                   "inaccuracy", "mistake", "blunder"]}
        for ann in annotations:
            q = ann.quality
            if q in counts:
                counts[q] += 1
        total = len(annotations) or 1
        accuracy = max(0, 100 - (
            counts["blunder"] * 4 + counts["mistake"] * 2 + counts["inaccuracy"] * 0.5
        ) / total * 10)
        return {"counts": counts, "accuracy": round(accuracy, 1)}
