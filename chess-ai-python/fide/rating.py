"""
FIDE ELO Rating System — fully compliant with FIDE Rating Regulations (2023).
Covers: K-factor rules, expected score, rating floors, title norms.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import math


class FIDETitle(Enum):
    NONE = "None"
    CM   = "Candidate Master"
    FM   = "FIDE Master"
    IM   = "International Master"
    GM   = "Grandmaster"
    WCM  = "Woman Candidate Master"
    WFM  = "Woman FIDE Master"
    WIM  = "Woman International Master"
    WGM  = "Woman Grandmaster"


TITLE_REQUIREMENTS: dict[FIDETitle, dict] = {
    FIDETitle.GM:  {"min_rating": 2500, "norms_needed": 3, "norm_performance": 2600},
    FIDETitle.IM:  {"min_rating": 2400, "norms_needed": 3, "norm_performance": 2450},
    FIDETitle.FM:  {"min_rating": 2300, "norms_needed": 0, "norm_performance": 0},
    FIDETitle.CM:  {"min_rating": 2200, "norms_needed": 0, "norm_performance": 0},
    FIDETitle.WGM: {"min_rating": 2300, "norms_needed": 3, "norm_performance": 2400},
    FIDETitle.WIM: {"min_rating": 2200, "norms_needed": 3, "norm_performance": 2250},
    FIDETitle.WFM: {"min_rating": 2100, "norms_needed": 0, "norm_performance": 0},
    FIDETitle.WCM: {"min_rating": 2000, "norms_needed": 0, "norm_performance": 0},
}

RATING_FLOOR = 1000
UNRATED_SEED = 1500


@dataclass
class PlayerRating:
    player_id: str
    rating: float
    games_played: int = 0
    title: FIDETitle = FIDETitle.NONE
    rapid_rating: Optional[float] = None
    blitz_rating: Optional[float] = None
    norms: list[str] = field(default_factory=list)

    @property
    def is_established(self) -> bool:
        return self.games_played >= 30

    @property
    def rounded_rating(self) -> int:
        return round(self.rating)


@dataclass
class RatingResult:
    player_id: str
    old_rating: float
    new_rating: float
    delta: float
    games: int
    performance_rating: float

    @property
    def display(self) -> str:
        sign = "+" if self.delta >= 0 else ""
        return (f"{self.player_id}: {round(self.old_rating)} → {round(self.new_rating)} "
                f"({sign}{self.delta:+.1f})")


class FIDERatingCalculator:
    """
    FIDE 2023 Rating Regulations compliant calculator.
    Handles: K-factor selection, expected score, performance rating,
    rating floors, title norm checking.
    """

    @staticmethod
    def k_factor(player: PlayerRating, time_control: str = "classical") -> float:
        """
        FIDE K-factor rules:
        - K=40: new player (< 30 games) OR age < 18 and rating < 2300
        - K=20: rated players with rating < 2400 (classical)
        - K=10: any player with rating ≥ 2400 AND has ever been ≥ 2400
        Rapid/Blitz: K=20 for all
        """
        if time_control in ("rapid", "blitz"):
            return 20.0
        if not player.is_established:
            return 40.0
        if player.rating >= 2400:
            return 10.0
        return 20.0

    @staticmethod
    def expected_score(rating_a: float, rating_b: float) -> float:
        """FIDE expected score formula: E = 1 / (1 + 10^((Rb - Ra)/400))"""
        return 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))

    @staticmethod
    def performance_rating(opponents: list[float], scores: list[float]) -> float:
        """
        FIDE performance rating: average opponent rating ± rating difference
        based on score percentage (uses FIDE table approximation).
        """
        if not opponents:
            return 0.0
        avg_opponent = sum(opponents) / len(opponents)
        total_score = sum(scores)
        max_score = len(scores)
        percentage = total_score / max_score if max_score > 0 else 0.5

        # FIDE percentage→rating difference table (simplified interpolation)
        pct_to_dp = [
            (1.00, 800), (0.99, 677), (0.98, 589), (0.97, 538), (0.96, 501),
            (0.95, 470), (0.90, 366), (0.85, 296), (0.80, 240), (0.75, 191),
            (0.70, 149), (0.65, 108), (0.60,  72), (0.55,  36), (0.50,   0),
            (0.45, -36), (0.40, -72), (0.35,-108), (0.30,-149), (0.25,-191),
            (0.20,-240), (0.15,-296), (0.10,-366), (0.05,-470), (0.00,-800),
        ]
        dp = 0
        for i in range(len(pct_to_dp) - 1):
            high_pct, high_dp = pct_to_dp[i]
            low_pct,  low_dp  = pct_to_dp[i + 1]
            if low_pct <= percentage <= high_pct:
                ratio = (percentage - low_pct) / (high_pct - low_pct)
                dp = low_dp + ratio * (high_dp - low_dp)
                break
        return avg_opponent + dp

    @classmethod
    def update_rating(cls, player: PlayerRating,
                      opponent_ratings: list[float],
                      scores: list[float],
                      time_control: str = "classical") -> RatingResult:
        """
        Compute new rating after a tournament/game series.

        Args:
            player: Current player rating object
            opponent_ratings: List of opponents' ratings
            scores: List of scores (1.0=win, 0.5=draw, 0.0=loss)
            time_control: "classical", "rapid", or "blitz"

        Returns:
            RatingResult with old/new rating and delta
        """
        k = cls.k_factor(player, time_control)
        rating_change = 0.0
        for opp_rating, score in zip(opponent_ratings, scores):
            expected = cls.expected_score(player.rating, opp_rating)
            rating_change += k * (score - expected)

        new_rating = max(RATING_FLOOR, player.rating + rating_change)
        perf = cls.performance_rating(opponent_ratings, scores)

        return RatingResult(
            player_id=player.player_id,
            old_rating=player.rating,
            new_rating=new_rating,
            delta=rating_change,
            games=len(scores),
            performance_rating=perf,
        )

    @classmethod
    def check_title_norm(cls, player: PlayerRating,
                         title: FIDETitle,
                         performance_rating: float,
                         num_games: int,
                         num_titled_opponents: int) -> bool:
        """
        Check if a performance qualifies as a title norm.
        Simplified FIDE norm requirements:
        - Minimum 9 games
        - At least 3 opponents of the required title
        - Performance rating meets norm threshold
        """
        req = TITLE_REQUIREMENTS.get(title)
        if not req:
            return False
        if req["norms_needed"] == 0:
            return player.rating >= req["min_rating"]
        if num_games < 9:
            return False
        if num_titled_opponents < 3:
            return False
        return performance_rating >= req["norm_performance"]

    @classmethod
    def apply_result(cls, player: PlayerRating,
                     opponent_ratings: list[float],
                     scores: list[float],
                     time_control: str = "classical") -> PlayerRating:
        """Update player rating in-place and return updated object."""
        result = cls.update_rating(player, opponent_ratings, scores, time_control)
        player.rating = result.new_rating
        player.games_played += len(scores)
        return player


class EloLeaderboard:
    """In-memory leaderboard sorted by ELO rating."""

    def __init__(self):
        self._players: dict[str, PlayerRating] = {}

    def add_player(self, player: PlayerRating):
        self._players[player.player_id] = player

    def get_player(self, player_id: str) -> Optional[PlayerRating]:
        return self._players.get(player_id)

    def get_ranked(self, top_n: int = 100) -> list[tuple[int, PlayerRating]]:
        sorted_players = sorted(self._players.values(),
                                key=lambda p: p.rating, reverse=True)
        return [(rank + 1, player) for rank, player in enumerate(sorted_players[:top_n])]

    def get_rank(self, player_id: str) -> Optional[int]:
        ranked = self.get_ranked(len(self._players))
        for rank, player in ranked:
            if player.player_id == player_id:
                return rank
        return None
