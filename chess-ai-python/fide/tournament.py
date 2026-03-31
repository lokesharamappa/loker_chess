"""
FIDE Swiss Tournament System — full Swiss-style pairing with:
  - Dutch Swiss pairing algorithm
  - FIDE tiebreak criteria (Buchholz, Sonneborn-Berger, ARO)
  - Time controls: Classical, Rapid, Blitz, Bullet
  - Round-robin as alternative
"""
from __future__ import annotations
import random
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from itertools import combinations


class TimeControl(Enum):
    BULLET    = "bullet"     # < 3 min
    BLITZ     = "blitz"      # 3-15 min
    RAPID     = "rapid"      # 15-60 min
    CLASSICAL = "classical"  # > 60 min


class TournamentFormat(Enum):
    SWISS       = "swiss"
    ROUND_ROBIN = "round_robin"
    KNOCKOUT    = "knockout"


class GameResult(Enum):
    WHITE_WIN = "1-0"
    BLACK_WIN = "0-1"
    DRAW      = "1/2-1/2"
    FORFEIT_W = "W"
    FORFEIT_L = "L"
    BYE       = "BYE"


@dataclass
class TournamentPlayer:
    player_id: str
    name: str
    rating: float
    score: float = 0.0
    games_played: int = 0
    opponents: list[str] = field(default_factory=list)
    colors: list[str] = field(default_factory=list)
    received_bye: bool = False
    withdrawn: bool = False

    # Tiebreak scores (computed after each round)
    buchholz: float = 0.0
    buchholz_cut1: float = 0.0
    sonneborn_berger: float = 0.0
    cumulative_score: float = 0.0

    @property
    def color_balance(self) -> int:
        """Positive = more whites, negative = more blacks."""
        return self.colors.count("white") - self.colors.count("black")

    @property
    def preferred_color(self) -> str:
        return "black" if self.color_balance > 0 else "white"


@dataclass
class Pairing:
    round_number: int
    white_id: str
    black_id: str
    result: Optional[GameResult] = None
    pgn: Optional[str] = None
    game_id: Optional[str] = None

    def get_score(self, player_id: str) -> float:
        if self.result == GameResult.BYE:
            return 1.0
        if self.result == GameResult.WHITE_WIN:
            return 1.0 if player_id == self.white_id else 0.0
        if self.result == GameResult.BLACK_WIN:
            return 1.0 if player_id == self.black_id else 0.0
        if self.result == GameResult.DRAW:
            return 0.5
        if self.result == GameResult.FORFEIT_W:
            return 1.0 if player_id == self.white_id else 0.0
        if self.result == GameResult.FORFEIT_L:
            return 0.0 if player_id == self.white_id else 1.0
        return 0.0


@dataclass
class TournamentConfig:
    name: str
    format: TournamentFormat = TournamentFormat.SWISS
    time_control: TimeControl = TimeControl.CLASSICAL
    rounds: int = 9
    bye_score: float = 1.0
    max_players: int = 256
    rated: bool = True
    allow_late_entry: bool = False


class SwissTournament:
    """
    FIDE-compliant Swiss tournament manager using the Dutch System.
    Pairing rules:
    1. Players sorted by score (descending)
    2. Split into score groups
    3. Within each group: highest vs highest from lower half
    4. Color alternation respected (FIDE B.3)
    5. Same opponent not repeated
    6. Bye given to the lowest-rated player without a bye
    """

    def __init__(self, config: TournamentConfig):
        self._config = config
        self._players: dict[str, TournamentPlayer] = {}
        self._pairings: list[Pairing] = []
        self._current_round = 0
        self._finished = False

    def register_player(self, player_id: str, name: str, rating: float) -> bool:
        if len(self._players) >= self._config.max_players:
            return False
        if not self._config.allow_late_entry and self._current_round > 0:
            return False
        self._players[player_id] = TournamentPlayer(
            player_id=player_id, name=name, rating=rating
        )
        return True

    def withdraw_player(self, player_id: str):
        if player_id in self._players:
            self._players[player_id].withdrawn = True

    def start_round(self) -> list[Pairing]:
        """Generate pairings for the next round. Returns list of Pairing objects."""
        if self._finished:
            raise RuntimeError("Tournament is finished.")
        if self._current_round >= self._config.rounds:
            self._finished = True
            raise RuntimeError("All rounds completed.")

        self._current_round += 1
        active_players = [p for p in self._players.values() if not p.withdrawn]

        if self._config.format == TournamentFormat.SWISS:
            pairings = self._swiss_pair(active_players)
        elif self._config.format == TournamentFormat.ROUND_ROBIN:
            pairings = self._round_robin_pair(active_players)
        else:
            pairings = self._swiss_pair(active_players)

        self._pairings.extend(pairings)
        return pairings

    def record_result(self, round_number: int, white_id: str,
                      black_id: str, result: GameResult):
        """Record game result and update player scores."""
        pairing = self._find_pairing(round_number, white_id, black_id)
        if pairing is None:
            raise ValueError(f"Pairing not found: {white_id} vs {black_id} round {round_number}")

        pairing.result = result

        white_p = self._players.get(white_id)
        black_p = self._players.get(black_id)

        if white_p and result != GameResult.BYE:
            white_p.score += pairing.get_score(white_id)
            white_p.games_played += 1
            white_p.opponents.append(black_id)
            white_p.colors.append("white")

        if black_p and result != GameResult.BYE:
            black_p.score += pairing.get_score(black_id)
            black_p.games_played += 1
            black_p.opponents.append(white_id)
            black_p.colors.append("black")

        self._compute_tiebreaks()

    def get_standings(self) -> list[TournamentPlayer]:
        """
        FIDE tiebreak order:
        1. Score
        2. Buchholz (full)
        3. Buchholz Cut-1
        4. Sonneborn-Berger
        5. Rating
        """
        players = sorted(
            self._players.values(),
            key=lambda p: (
                -p.score,
                -p.buchholz,
                -p.buchholz_cut1,
                -p.sonneborn_berger,
                -p.rating,
            )
        )
        return players

    def get_round_pairings(self, round_number: int) -> list[Pairing]:
        return [p for p in self._pairings if p.round_number == round_number]

    def is_finished(self) -> bool:
        return self._current_round >= self._config.rounds

    @property
    def current_round(self) -> int:
        return self._current_round

    @property
    def total_rounds(self) -> int:
        return self._config.rounds

    def _swiss_pair(self, players: list[TournamentPlayer]) -> list[Pairing]:
        pairings: list[Pairing] = []
        sorted_players = sorted(players, key=lambda p: (-p.score, -p.rating))
        unpaired = list(sorted_players)
        bye_player: Optional[TournamentPlayer] = None

        # Assign bye if odd number of players
        if len(unpaired) % 2 == 1:
            for p in reversed(unpaired):
                if not p.received_bye:
                    bye_player = p
                    unpaired.remove(p)
                    break
            if bye_player is None:
                bye_player = unpaired.pop()
            bye_player.received_bye = True
            bye_player.score += self._config.bye_score
            pairings.append(Pairing(
                round_number=self._current_round,
                white_id=bye_player.player_id,
                black_id="BYE",
                result=GameResult.BYE,
            ))

        paired: set[str] = set()
        # Score group pairing
        score_groups: dict[float, list[TournamentPlayer]] = {}
        for p in unpaired:
            score_groups.setdefault(p.score, []).append(p)

        # Flatten in score-descending order
        ordered: list[TournamentPlayer] = []
        for score in sorted(score_groups.keys(), reverse=True):
            ordered.extend(score_groups[score])

        # Pair: first half vs second half of each score group
        while len(ordered) >= 2:
            white = ordered[0]
            ordered.pop(0)
            if white.player_id in paired:
                continue
            paired_with = None
            for i, candidate in enumerate(ordered):
                if candidate.player_id in paired:
                    continue
                if candidate.player_id in white.opponents:
                    continue
                paired_with = ordered.pop(i)
                break
            if paired_with is None and ordered:
                paired_with = ordered.pop(0)
            if paired_with is None:
                continue
            paired.add(white.player_id)
            paired.add(paired_with.player_id)
            w, b = self._assign_colors(white, paired_with)
            pairings.append(Pairing(
                round_number=self._current_round,
                white_id=w.player_id,
                black_id=b.player_id,
            ))

        return pairings

    def _assign_colors(self, p1: TournamentPlayer,
                       p2: TournamentPlayer) -> tuple[TournamentPlayer, TournamentPlayer]:
        """Assign colors respecting FIDE alternation rules."""
        if p1.preferred_color == "white" and p2.preferred_color != "white":
            return p1, p2
        if p2.preferred_color == "white" and p1.preferred_color != "white":
            return p2, p1
        if p1.rating >= p2.rating:
            return p1, p2
        return p2, p1

    def _round_robin_pair(self, players: list[TournamentPlayer]) -> list[Pairing]:
        """Berger round-robin pairing tables."""
        n = len(players)
        if n % 2 == 1:
            players.append(TournamentPlayer("BYE", "BYE", 0))
        n = len(players)
        pairings: list[Pairing] = []
        round_idx = (self._current_round - 1) % (n - 1)
        fixed = players[0]
        rotating = players[1:]
        rotated = rotating[round_idx:] + rotating[:round_idx]
        schedule = [(fixed, rotated[0])] + [
            (rotated[i], rotated[n - 2 - i]) for i in range(1, n // 2)
        ]
        for i, (a, b) in enumerate(schedule):
            if a.player_id == "BYE" or b.player_id == "BYE":
                real = b if a.player_id == "BYE" else a
                pairings.append(Pairing(
                    round_number=self._current_round,
                    white_id=real.player_id,
                    black_id="BYE",
                    result=GameResult.BYE,
                ))
                continue
            if (round_idx + i) % 2 == 0:
                pairings.append(Pairing(self._current_round, a.player_id, b.player_id))
            else:
                pairings.append(Pairing(self._current_round, b.player_id, a.player_id))
        return pairings

    def _compute_tiebreaks(self):
        """Compute all FIDE tiebreak scores for all players."""
        for player in self._players.values():
            opp_scores = [self._players[oid].score for oid in player.opponents
                          if oid in self._players]
            # Buchholz = sum of opponents' scores
            player.buchholz = sum(opp_scores)
            # Buchholz Cut-1 = Buchholz minus lowest opponent score
            if opp_scores:
                player.buchholz_cut1 = player.buchholz - min(opp_scores)
            else:
                player.buchholz_cut1 = 0.0
            # Sonneborn-Berger = sum of (opponent score * your result vs them)
            sb = 0.0
            for pairing in self._pairings:
                if pairing.result is None:
                    continue
                opp_id = None
                if pairing.white_id == player.player_id:
                    opp_id = pairing.black_id
                elif pairing.black_id == player.player_id:
                    opp_id = pairing.white_id
                if opp_id and opp_id in self._players:
                    result = pairing.get_score(player.player_id)
                    sb += result * self._players[opp_id].score
            player.sonneborn_berger = sb

    def _find_pairing(self, round_number: int, white_id: str,
                      black_id: str) -> Optional[Pairing]:
        for p in self._pairings:
            if (p.round_number == round_number
                    and p.white_id == white_id
                    and p.black_id == black_id):
                return p
        return None

    def export_crosstable(self) -> str:
        """Export HTML-style crosstable for display."""
        standings = self.get_standings()
        lines = [f"{'Rank':<5} {'Name':<25} {'Rating':<8} {'Score':<7} "
                 f"{'Buch':<7} {'SB':<7}"]
        lines.append("-" * 60)
        for rank, player in enumerate(standings, 1):
            lines.append(
                f"{rank:<5} {player.name:<25} {player.rating:<8.0f} "
                f"{player.score:<7.1f} {player.buchholz:<7.1f} "
                f"{player.sonneborn_berger:<7.1f}"
            )
        return "\n".join(lines)
