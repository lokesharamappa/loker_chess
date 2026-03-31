"""
Tests for the AI agent system — evaluator, search, opening, endgame, orchestrator.
"""
import pytest
import chess
from core.evaluator import Evaluator, MATE_SCORE
from core.transposition_table import TranspositionTable, ZobristHasher
from core.search import AlphaBetaSearch
from agents.base_agent import AgentConfig
from agents.search_agent import SearchAgent
from agents.orchestrator import ChessAIOrchestrator, OrchestratorConfig


@pytest.fixture
def evaluator():
    return Evaluator()


@pytest.fixture
def search_agent():
    cfg = AgentConfig(name="test", max_depth=6, time_limit_ms=2000)
    return SearchAgent(cfg, strength="intermediate", tt_size_mb=8)


@pytest.fixture
def orchestrator():
    return ChessAIOrchestrator(OrchestratorConfig(
        strength="intermediate",
        tt_size_mb=8,
        use_opening_book=False,
        use_endgame_tb=False,
    ))


class TestEvaluator:
    def test_starting_position_near_zero(self, evaluator):
        board = chess.Board()
        score = evaluator.evaluate(board)
        assert abs(score) < 50, f"Start position eval should be near 0, got {score}"

    def test_checkmate_returns_negative_mate(self, evaluator):
        board = chess.Board("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
        score = evaluator.evaluate(board)
        assert score < -90_000, f"Scholar's mate should be losing, got {score}"

    def test_stalemate_returns_zero(self, evaluator):
        board = chess.Board("k7/8/1Q6/8/8/8/8/K7 b - - 0 1")
        score = evaluator.evaluate(board)
        assert score == 0

    def test_material_advantage_positive(self, evaluator):
        board = chess.Board()
        board.set_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKB1R w KQkq - 0 1")
        score = evaluator.evaluate(board)
        assert score > 0, "White with extra knight should be positive"

    def test_symmetry(self, evaluator):
        board = chess.Board()
        score_w = evaluator.evaluate(board)
        board2 = chess.Board()
        board2.push(chess.Move.from_uci("e2e4"))
        board2.push(chess.Move.from_uci("e7e5"))
        score2 = evaluator.evaluate(board2)
        assert abs(score_w) < 100
        assert abs(score2) < 200


class TestTranspositionTable:
    def test_store_and_retrieve(self):
        tt = TranspositionTable(size_mb=4)
        from core.transposition_table import NodeType
        tt.store(12345, depth=5, score=100, flag=NodeType.EXACT, best_move=None)
        entry = tt.probe(12345)
        assert entry is not None
        assert entry.score == 100
        assert entry.depth == 5

    def test_miss_returns_none(self):
        tt = TranspositionTable(size_mb=4)
        assert tt.probe(99999) is None

    def test_zobrist_deterministic(self):
        hasher = ZobristHasher()
        board = chess.Board()
        h1 = hasher.compute(board)
        h2 = hasher.compute(board)
        assert h1 == h2

    def test_zobrist_changes_on_move(self):
        hasher = ZobristHasher()
        board = chess.Board()
        h1 = hasher.compute(board)
        board.push(chess.Move.from_uci("e2e4"))
        h2 = hasher.compute(board)
        assert h1 != h2

    def test_zobrist_reverts_after_pop(self):
        hasher = ZobristHasher()
        board = chess.Board()
        h1 = hasher.compute(board)
        board.push(chess.Move.from_uci("e2e4"))
        board.pop()
        h2 = hasher.compute(board)
        assert h1 == h2


class TestSearchAgent:
    def test_returns_legal_move(self, search_agent):
        board = chess.Board()
        decision = search_agent.select_move(board, time_limit_ms=500)
        assert decision is not None
        assert decision.move in chess.Board().legal_moves

    def test_finds_checkmate_in_one(self, search_agent):
        board = chess.Board("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4")
        decision = search_agent.select_move(board, time_limit_ms=2000)
        assert decision is not None
        assert decision.move.uci() == "h5f7"

    def test_captures_hanging_queen(self, search_agent):
        board = chess.Board("rnbqkbnr/pppp1ppp/8/4p3/4P1Q1/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2")
        decision = search_agent.select_move(board, time_limit_ms=1000)
        assert decision is not None
        assert decision.move.to_square == chess.G4

    def test_single_legal_move_returns_immediately(self, search_agent):
        board = chess.Board("k7/8/1K6/8/8/8/8/7R b - - 0 1")
        legal_moves = list(board.legal_moves)
        if len(legal_moves) == 1:
            decision = search_agent.select_move(board)
            assert decision is not None
            assert decision.move == legal_moves[0]

    def test_no_move_on_game_over(self, search_agent):
        board = chess.Board("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
        assert board.is_checkmate()
        decision = search_agent.select_move(board)
        assert decision is None

    def test_strength_levels(self):
        from agents.search_agent import STRENGTH_PROFILES
        for strength_name in STRENGTH_PROFILES:
            cfg = AgentConfig(name="test", max_depth=4, time_limit_ms=200)
            agent = SearchAgent(cfg, strength=strength_name, tt_size_mb=4)
            board = chess.Board()
            decision = agent.select_move(board, time_limit_ms=200)
            assert decision is not None, f"Strength {strength_name} returned None"

    def test_tt_stats(self, search_agent):
        board = chess.Board()
        search_agent.select_move(board, time_limit_ms=300)
        stats = search_agent.tt_stats
        assert "hits" in stats
        assert "misses" in stats
        assert "usage_pct" in stats


class TestOrchestrator:
    def test_get_best_move_start(self, orchestrator):
        board = chess.Board()
        decision = orchestrator.get_best_move(board, time_limit_ms=500)
        assert decision is not None
        assert decision.move in board.legal_moves

    def test_raises_on_game_over(self, orchestrator):
        board = chess.Board("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
        with pytest.raises(ValueError):
            orchestrator.get_best_move(board)

    def test_phase_detection_opening(self, orchestrator):
        from agents.orchestrator import GamePhase
        board = chess.Board()
        phase = orchestrator.detect_phase(board)
        assert phase == GamePhase.OPENING

    def test_phase_detection_endgame(self, orchestrator):
        from agents.orchestrator import GamePhase
        board = chess.Board("k7/8/8/8/8/8/8/K7 w - - 0 1")
        phase = orchestrator.detect_phase(board)
        assert phase == GamePhase.ENDGAME

    def test_decision_log(self, orchestrator):
        board = chess.Board()
        orchestrator.clear_log()
        orchestrator.get_best_move(board, time_limit_ms=300)
        assert len(orchestrator.decision_log) == 1

    def test_set_strength(self, orchestrator):
        orchestrator.set_strength("beginner")
        board = chess.Board()
        decision = orchestrator.get_best_move(board, time_limit_ms=300)
        assert decision is not None

    def test_static_eval_is_int(self, orchestrator):
        board = chess.Board()
        score = orchestrator.get_static_eval(board)
        assert isinstance(score, int)
