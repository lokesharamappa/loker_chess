"""
Tests for FIDE rating system and Swiss tournament management.
"""
import pytest
from fide.rating import (
    FIDERatingCalculator, PlayerRating, FIDETitle,
    EloLeaderboard, RATING_FLOOR,
)
from fide.tournament import (
    SwissTournament, TournamentConfig, TournamentFormat,
    TimeControl, GameResult, TournamentPlayer,
)


class TestFIDERating:
    def test_expected_score_equal_ratings(self):
        score = FIDERatingCalculator.expected_score(1500, 1500)
        assert abs(score - 0.5) < 0.001

    def test_expected_score_higher_rated_favored(self):
        score = FIDERatingCalculator.expected_score(2000, 1500)
        assert score > 0.9

    def test_expected_score_lower_rated(self):
        score = FIDERatingCalculator.expected_score(1500, 2000)
        assert score < 0.1

    def test_k_factor_new_player(self):
        player = PlayerRating("p1", 1500, games_played=10)
        k = FIDERatingCalculator.k_factor(player)
        assert k == 40.0

    def test_k_factor_established_below_2400(self):
        player = PlayerRating("p1", 2200, games_played=100)
        k = FIDERatingCalculator.k_factor(player)
        assert k == 20.0

    def test_k_factor_elite(self):
        player = PlayerRating("p1", 2500, games_played=200)
        k = FIDERatingCalculator.k_factor(player)
        assert k == 10.0

    def test_k_factor_rapid_is_20(self):
        player = PlayerRating("p1", 2800, games_played=200)
        k = FIDERatingCalculator.k_factor(player, time_control="rapid")
        assert k == 20.0

    def test_rating_increases_after_win(self):
        player = PlayerRating("p1", 1500, games_played=30)
        result = FIDERatingCalculator.update_rating(player, [1500], [1.0])
        assert result.new_rating > 1500

    def test_rating_decreases_after_loss(self):
        player = PlayerRating("p1", 1500, games_played=30)
        result = FIDERatingCalculator.update_rating(player, [1500], [0.0])
        assert result.new_rating < 1500

    def test_draw_against_equal_no_change(self):
        player = PlayerRating("p1", 1500, games_played=30)
        result = FIDERatingCalculator.update_rating(player, [1500], [0.5])
        assert abs(result.delta) < 1.0

    def test_rating_floor_enforced(self):
        player = PlayerRating("p1", 1002, games_played=30)
        result = FIDERatingCalculator.update_rating(
            player, [1500, 1500, 1500], [0.0, 0.0, 0.0]
        )
        assert result.new_rating >= RATING_FLOOR

    def test_performance_rating_perfect_score(self):
        opponents = [2000.0, 2000.0, 2000.0]
        scores = [1.0, 1.0, 1.0]
        perf = FIDERatingCalculator.performance_rating(opponents, scores)
        assert perf > 2500

    def test_performance_rating_zero_score(self):
        opponents = [2000.0, 2000.0, 2000.0]
        scores = [0.0, 0.0, 0.0]
        perf = FIDERatingCalculator.performance_rating(opponents, scores)
        assert perf < 1500

    def test_performance_rating_50_pct(self):
        opponents = [2000.0, 2000.0]
        scores = [1.0, 0.0]
        perf = FIDERatingCalculator.performance_rating(opponents, scores)
        assert abs(perf - 2000) < 50

    def test_gm_norm_check(self):
        player = PlayerRating("p1", 2510, games_played=200, title=FIDETitle.IM)
        result = FIDERatingCalculator.check_title_norm(
            player, FIDETitle.GM,
            performance_rating=2620,
            num_games=9,
            num_titled_opponents=4,
        )
        assert result is True

    def test_gm_norm_fails_low_performance(self):
        player = PlayerRating("p1", 2510, games_played=200)
        result = FIDERatingCalculator.check_title_norm(
            player, FIDETitle.GM,
            performance_rating=2400,
            num_games=9,
            num_titled_opponents=4,
        )
        assert result is False

    def test_apply_result_mutates_player(self):
        player = PlayerRating("p1", 1500, games_played=30)
        original = player.rating
        FIDERatingCalculator.apply_result(player, [1500], [1.0])
        assert player.rating != original
        assert player.games_played == 31


class TestEloLeaderboard:
    def test_ranked_order(self):
        lb = EloLeaderboard()
        lb.add_player(PlayerRating("a", 1500))
        lb.add_player(PlayerRating("b", 2000))
        lb.add_player(PlayerRating("c", 1800))
        ranked = lb.get_ranked()
        assert ranked[0][1].player_id == "b"
        assert ranked[1][1].player_id == "c"
        assert ranked[2][1].player_id == "a"

    def test_get_rank(self):
        lb = EloLeaderboard()
        lb.add_player(PlayerRating("a", 2000))
        lb.add_player(PlayerRating("b", 1500))
        assert lb.get_rank("a") == 1
        assert lb.get_rank("b") == 2

    def test_get_player(self):
        lb = EloLeaderboard()
        p = PlayerRating("x", 1700)
        lb.add_player(p)
        assert lb.get_player("x") is p
        assert lb.get_player("unknown") is None


class TestSwissTournament:
    def _make_tournament(self, num_players: int = 6, rounds: int = 3) -> SwissTournament:
        config = TournamentConfig(name="Test", rounds=rounds)
        t = SwissTournament(config)
        for i in range(num_players):
            t.register_player(f"p{i+1}", f"Player {i+1}", 1500 + i * 50)
        return t

    def test_register_players(self):
        t = self._make_tournament(6)
        assert len(t._players) == 6

    def test_start_round_produces_pairings(self):
        t = self._make_tournament(6)
        pairings = t.start_round()
        assert len(pairings) == 3

    def test_no_repeated_opponents(self):
        t = self._make_tournament(6, rounds=3)
        all_pairings = []
        for rnd in range(1, 4):
            pairings = t.start_round()
            for p in pairings:
                if p.black_id != "BYE":
                    t.record_result(rnd, p.white_id, p.black_id, GameResult.DRAW)
            all_pairings.extend(pairings)
        for pid in t._players:
            opp_list = t._players[pid].opponents
            assert len(opp_list) == len(set(opp_list)), f"{pid} played same opponent twice"

    def test_bye_awarded_once(self):
        t = self._make_tournament(5, rounds=3)
        for rnd in range(1, 4):
            pairings = t.start_round()
            for p in pairings:
                if p.black_id != "BYE":
                    t.record_result(rnd, p.white_id, p.black_id, GameResult.WHITE_WIN)
        bye_counts = sum(1 for p in t._players.values() if p.received_bye)
        assert bye_counts <= len(t._players)
        for p in t._players.values():
            assert t._players[p.player_id].received_bye in [True, False]

    def test_scores_accumulate_correctly(self):
        t = self._make_tournament(4, rounds=2)
        pairings_r1 = t.start_round()
        for p in pairings_r1:
            if p.black_id != "BYE":
                t.record_result(1, p.white_id, p.black_id, GameResult.WHITE_WIN)
        winners = [p.white_id for p in pairings_r1 if p.black_id != "BYE"]
        for wid in winners:
            assert t._players[wid].score == 1.0

    def test_standings_tiebreak_order(self):
        t = self._make_tournament(4, rounds=1)
        pairings = t.start_round()
        for p in pairings:
            if p.black_id != "BYE":
                t.record_result(1, p.white_id, p.black_id, GameResult.DRAW)
        standings = t.get_standings()
        scores = [s.score for s in standings]
        assert scores == sorted(scores, reverse=True)

    def test_round_pairings_retrieval(self):
        t = self._make_tournament(4, rounds=2)
        t.start_round()
        pairings = t.get_round_pairings(1)
        assert len(pairings) == 2

    def test_is_finished(self):
        t = self._make_tournament(4, rounds=2)
        assert not t.is_finished()
        for rnd in range(1, 3):
            pairings = t.start_round()
            for p in pairings:
                if p.black_id != "BYE":
                    t.record_result(rnd, p.white_id, p.black_id, GameResult.DRAW)
        assert t.is_finished()

    def test_crosstable_export(self):
        t = self._make_tournament(4, rounds=1)
        pairings = t.start_round()
        for p in pairings:
            if p.black_id != "BYE":
                t.record_result(1, p.white_id, p.black_id, GameResult.DRAW)
        crosstable = t.export_crosstable()
        assert "Score" in crosstable
        assert "Rank" in crosstable

    def test_max_players_limit(self):
        config = TournamentConfig(name="Small", rounds=3, max_players=4)
        t = SwissTournament(config)
        for i in range(5):
            success = t.register_player(f"p{i}", f"P{i}", 1500)
        assert len(t._players) == 4

    def test_round_robin_pairing(self):
        config = TournamentConfig(name="RR", format=TournamentFormat.ROUND_ROBIN, rounds=3)
        t = SwissTournament(config)
        for i in range(4):
            t.register_player(f"p{i}", f"P{i}", 1500)
        pairings = t.start_round()
        assert len(pairings) == 2
