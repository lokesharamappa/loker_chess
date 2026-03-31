"""
Tests for extensions: NNUE evaluator, opening classifier,
annotator move quality, database models, and puzzle solver.
"""
import pytest
import chess
from core.nnue_evaluator import NNUEEvaluator, FeatureExtractor, NNUENetwork, FEATURE_SIZE
from core.opening_explorer import OpeningClassifier, get_classifier
from core.annotator import classify_quality, GameAnnotator, MoveAnnotation


class TestFeatureExtractor:
    def test_feature_length(self):
        extractor = FeatureExtractor()
        board = chess.Board()
        features = extractor.extract(board)
        assert features.shape == (FEATURE_SIZE,)

    def test_features_binary(self):
        extractor = FeatureExtractor()
        board = chess.Board()
        features = extractor.extract(board)
        assert set(features.tolist()).issubset({0.0, 1.0})

    def test_starting_position_has_32_pieces(self):
        extractor = FeatureExtractor()
        board = chess.Board()
        features = extractor.extract(board)
        assert int(features.sum()) == 32

    def test_empty_board_all_zeros(self):
        extractor = FeatureExtractor()
        board = chess.Board(fen=None)
        features = extractor.extract(board)
        assert features.sum() == 0.0

    def test_flip_is_symmetric(self):
        extractor = FeatureExtractor()
        board = chess.Board()
        f_white = extractor.extract(board)
        board.push(chess.Move.from_uci("e2e4"))
        f_black = extractor.extract(board)
        assert not (f_white == f_black).all()


class TestNNUENetwork:
    def test_forward_returns_float(self):
        import numpy as np
        net = NNUENetwork()
        net.randomize(seed=0)
        features = np.zeros(FEATURE_SIZE, dtype="float32")
        result = net.forward(features)
        assert isinstance(result, float)

    def test_save_and_load_roundtrip(self, tmp_path):
        import numpy as np
        net1 = NNUENetwork()
        net1.randomize(seed=42)
        path = str(tmp_path / "test.nnue")
        net1.save(path)
        net2 = NNUENetwork()
        net2.load(path)
        assert abs(net1.b3[0] - net2.b3[0]) < 1e-6

    def test_different_seeds_differ(self):
        net1 = NNUENetwork(); net1.randomize(seed=1)
        net2 = NNUENetwork(); net2.randomize(seed=2)
        assert not (net1.w1 == net2.w1).all()


class TestNNUEEvaluator:
    def test_evaluate_start_near_zero(self):
        ev = NNUEEvaluator()
        board = chess.Board()
        score = ev.evaluate(board)
        assert abs(score) < 200

    def test_checkmate_returns_mate_score(self):
        ev = NNUEEvaluator()
        # Fool's mate: after 1.f3 e5 2.g4 Qh4# — White is in checkmate
        board = chess.Board("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
        assert board.is_checkmate()
        score = ev.evaluate(board)
        assert score < -90_000

    def test_stalemate_returns_zero(self):
        ev = NNUEEvaluator()
        board = chess.Board("k7/8/1Q6/8/8/8/8/K7 b - - 0 1")
        score = ev.evaluate(board)
        assert score == 0

    def test_nnue_active_attribute(self):
        ev = NNUEEvaluator()
        assert isinstance(ev.is_nnue_active, bool)

    def test_generate_training_sample(self):
        ev = NNUEEvaluator()
        board = chess.Board()
        features, target = ev.generate_training_data(board, 0.5)
        assert features.shape == (FEATURE_SIZE,)
        assert isinstance(target, float)


class TestOpeningClassifier:
    def test_starting_position_unclassified(self):
        clf = OpeningClassifier()
        board = chess.Board()
        result = clf.classify(board)
        assert result is None

    def test_e4_e5_nf3_is_kings_knight(self):
        clf = OpeningClassifier()
        board = chess.Board()
        for uci in ["e2e4", "e7e5", "g1f3"]:
            board.push(chess.Move.from_uci(uci))
        result = clf.classify(board)
        assert result is not None
        assert result.eco.startswith("C")

    def test_e4_c5_is_sicilian(self):
        clf = OpeningClassifier()
        board = chess.Board()
        board.push(chess.Move.from_uci("e2e4"))
        board.push(chess.Move.from_uci("c7c5"))
        result = clf.classify(board)
        assert result is not None
        assert "Sicilian" in result.name or result.eco.startswith("B2")

    def test_search_by_name(self):
        clf = OpeningClassifier()
        results = clf.search_by_name("Sicilian")
        assert len(results) > 0
        assert all("Sicilian" in r.name for r in results)

    def test_get_by_eco(self):
        clf = OpeningClassifier()
        entry = clf.get_by_eco("C50")
        assert entry is not None
        assert entry.eco == "C50"

    def test_all_openings_returns_list(self):
        clf = OpeningClassifier()
        all_ops = clf.all_openings()
        assert len(all_ops) > 50
        assert all("eco" in o and "name" in o for o in all_ops)

    def test_classify_from_moves(self):
        clf = OpeningClassifier()
        result = clf.classify_from_moves(["e2e4", "e7e5", "g1f3"])
        assert result is not None

    def test_singleton_get_classifier(self):
        c1 = get_classifier()
        c2 = get_classifier()
        assert c1 is c2


class TestMoveQuality:
    def test_blunder_threshold(self):
        q, sym = classify_quality(-350)
        assert q == "blunder"
        assert sym == "??"

    def test_mistake_threshold(self):
        q, sym = classify_quality(-150)
        assert q == "mistake"
        assert sym == "?"

    def test_inaccuracy_threshold(self):
        q, sym = classify_quality(-70)
        assert q == "inaccuracy"
        assert sym == "?!"

    def test_good_threshold(self):
        q, sym = classify_quality(80)
        assert q == "good"
        assert sym == "!"

    def test_brilliant_threshold(self):
        q, sym = classify_quality(250)
        assert q == "brilliant"
        assert sym == "!!"

    def test_best_threshold(self):
        q, sym = classify_quality(10)
        assert q == "best"
        assert sym == ""

    def test_none_delta_returns_book(self):
        q, sym = classify_quality(None)
        assert q == "book"
        assert sym == ""


class TestGameAnnotator:
    def test_annotator_creates_without_error(self):
        ann = GameAnnotator(depth=4, time_per_move_ms=200)
        assert ann is not None

    def test_classify_moves_returns_dict(self):
        ann = GameAnnotator(depth=4, time_per_move_ms=200)
        fake_annotations = [
            MoveAnnotation(1, "e2e4", "e4", 10, None, "e2e4", 10, 0, "best", "", ""),
            MoveAnnotation(2, "e7e5", "e5", -10, None, "e7e5", -10, 0, "best", "", ""),
            MoveAnnotation(3, "g1f3", "Nf3", 20, None, "g1f3", 20, 0, "good", "!", ""),
            MoveAnnotation(4, "b8c6", "Nc6", -20, None, "b8c6", -20, -200, "blunder", "??", "Blunder"),
        ]
        result = ann.classify_moves(fake_annotations)
        assert "counts" in result
        assert "accuracy" in result
        assert result["counts"]["best"] == 2
        assert result["counts"]["blunder"] == 1
        assert 0 <= result["accuracy"] <= 100

    def test_annotate_board_sequence(self):
        ann = GameAnnotator(depth=4, time_per_move_ms=300)
        moves = ["e2e4", "e7e5", "g1f3", "b8c6"]
        annotations = ann.annotate_board_sequence(moves)
        assert len(annotations) > 0
        assert all(hasattr(a, "move_number") for a in annotations)
        assert all(hasattr(a, "quality") for a in annotations)
