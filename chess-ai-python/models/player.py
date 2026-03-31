"""
Player data models — Pydantic v2 schemas for player management.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from fide.rating import FIDETitle


class PlayerCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    display_name: str = Field(..., min_length=1, max_length=64)
    initial_rating: float = Field(default=1500.0, ge=100.0, le=3500.0)
    title: FIDETitle = FIDETitle.NONE


class PlayerResponse(BaseModel):
    player_id: str
    username: str
    display_name: str
    rating: float
    rapid_rating: Optional[float] = None
    blitz_rating: Optional[float] = None
    title: FIDETitle
    games_played: int
    wins: int
    draws: int
    losses: int
    win_rate: float
    joined_at: datetime

    @property
    def score_pct(self) -> float:
        total = self.wins + self.draws + self.losses
        if total == 0:
            return 0.0
        return (self.wins + 0.5 * self.draws) / total * 100


class RatingHistoryEntry(BaseModel):
    date: datetime
    rating: float
    delta: float
    game_id: str
    opponent_id: str
    result: str


class PlayerStatsResponse(BaseModel):
    player_id: str
    rating: float
    peak_rating: float
    lowest_rating: float
    games_played: int
    wins: int
    draws: int
    losses: int
    win_rate: float
    streak_current: int
    streak_best: int
    favorite_opening: Optional[str] = None
    rating_history: List[RatingHistoryEntry] = Field(default_factory=list)
    performance_by_time_control: dict = Field(default_factory=dict)
