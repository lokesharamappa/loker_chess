"""
Multi-Agent Orchestrator — routes position to the most appropriate agent:
  1. OpeningAgent  → book moves (first ~20 moves)
  2. EndgameAgent  → Syzygy tablebases (≤7 pieces)
  3. SearchAgent   → Alpha-Beta PVS engine (everything else)

Also handles: game phase detection, analysis mode, and PGN annotation.
"""
from __future__ import annotations
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import chess
import chess.pgn

from agents.base_agent import AgentConfig, AgentDecision
from agents.opening_agent import OpeningAgent
from agents.search_agent import SearchAgent, STRENGTH_PROFILES
from agents.endgame_agent import EndgameAgent


class GamePhase(Enum):
    OPENING = "opening"
    MIDDLEGAME = "middlegame"
    ENDGAME = "endgame"


@dataclass
class OrchestratorConfig:
    strength: str = "grandmaster"
    tt_size_mb: int = 128
    time_limit_ms: float = 5000.0
    use_opening_book: bool = True
    use_endgame_tb: bool = True
    contempt: int = 10


class ChessAIOrchestrator:
    """
    Top-level AI controller that coordinates all sub-agents.
    Provides a single `get_best_move()` API for the web layer.
    """

    def __init__(self, config: Optional[OrchestratorConfig] = None):
        self._config = config or OrchestratorConfig()
        profile = STRENGTH_PROFILES.get(self._config.strength,
                                        STRENGTH_PROFILES["grandmaster"])

        agent_cfg = AgentConfig(
            name="ChessMasterPro",
            elo_strength=profile["elo"],
            max_depth=profile["depth"],
            time_limit_ms=self._config.time_limit_ms,
            use_opening_book=self._config.use_opening_book,
            use_endgame_tb=self._config.use_endgame_tb,
            contempt=self._config.contempt,
        )

        self._opening_agent = OpeningAgent(agent_cfg)
        self._search_agent = SearchAgent(
            agent_cfg, self._config.strength, self._config.tt_size_mb
        )
        self._endgame_agent = EndgameAgent(agent_cfg)
        self._decision_log: list[dict] = []

    def get_best_move(self, board: chess.Board,
                      time_limit_ms: Optional[float] = None) -> AgentDecision:
        """
        Primary API: returns the best move for the current position.
        Raises ValueError if the position is terminal.
        """
        if board.is_game_over():
            raise ValueError("Game is already over — no move to make.")

        tl = time_limit_ms or self._config.time_limit_ms
        phase = self.detect_phase(board)
        start = time.perf_counter()

        decision: Optional[AgentDecision] = None

        # 1. Try opening book
        if self._config.use_opening_book and phase == GamePhase.OPENING:
            decision = self._opening_agent.select_move(board, tl)

        # 2. Try endgame tablebase
        if decision is None and self._config.use_endgame_tb:
            decision = self._endgame_agent.select_move(board, tl)

        # 3. Fall back to search engine
        if decision is None:
            decision = self._search_agent.select_move(board, tl)

        if decision is None:
            raise RuntimeError("All agents failed to produce a move — this is a bug.")

        elapsed_ms = (time.perf_counter() - start) * 1000
        self._decision_log.append({
            "fen": board.fen(),
            "move": decision.uci(),
            "source": decision.source,
            "score": decision.score_str(),
            "phase": phase.value,
            "elapsed_ms": round(elapsed_ms, 1),
        })

        return decision

    def analyze_position(self, board: chess.Board,
                         depth: int = 25) -> AgentDecision:
        """
        Deep analysis mode — always uses search engine (ignores book/TB preference).
        """
        return self._search_agent.select_move(board, time_limit_ms=30_000)

    def get_opening_moves(self, board: chess.Board) -> list[dict]:
        """Return all book moves with frequencies for the analysis panel."""
        return self._opening_agent.get_all_book_moves(board)

    def get_endgame_wdl(self, board: chess.Board) -> Optional[str]:
        """Return tablebase Win/Draw/Loss for the position."""
        return self._endgame_agent.get_wdl(board)

    def detect_phase(self, board: chess.Board) -> GamePhase:
        """
        Classify game phase:
        - Opening: move ≤20 and book has entry
        - Endgame: ≤7 pieces or no queens + limited material
        - Middlegame: everything else
        """
        piece_count = chess.popcount(board.occupied)
        if piece_count <= 7:
            return GamePhase.ENDGAME
        queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + \
                 len(board.pieces(chess.QUEEN, chess.BLACK))
        rooks = len(board.pieces(chess.ROOK, chess.WHITE)) + \
                len(board.pieces(chess.ROOK, chess.BLACK))
        if queens == 0 or (queens <= 1 and rooks <= 2 and piece_count <= 12):
            return GamePhase.ENDGAME
        if board.fullmove_number <= 20:
            return GamePhase.OPENING
        return GamePhase.MIDDLEGAME

    def get_static_eval(self, board: chess.Board) -> int:
        """Get static position evaluation (centipawns, side-to-move positive)."""
        return self._search_agent.get_evaluation(board)

    def annotate_game(self, game: chess.pgn.Game) -> chess.pgn.Game:
        """
        Annotate every position in a PGN game with engine evaluations.
        Returns the annotated game.
        """
        board = game.board()
        node = game
        for move in game.mainline_moves():
            board.push(move)
            try:
                decision = self._search_agent.select_move(board, time_limit_ms=2000)
                if decision:
                    child = node.variations[0] if node.variations else node
                    child.comment = (f"[%eval {decision.score_str()}] "
                                     f"depth={decision.depth}")
            except Exception:
                pass
            node = node.variations[0] if node.variations else node
        return game

    def set_strength(self, strength: str):
        self._search_agent.set_strength(strength)
        self._config.strength = strength

    def set_elo(self, elo: int):
        self._search_agent.set_elo_strength(elo)

    @property
    def decision_log(self) -> list[dict]:
        return list(self._decision_log)

    def clear_log(self):
        self._decision_log.clear()

    def close(self):
        self._opening_agent.close()
        self._endgame_agent.close()
