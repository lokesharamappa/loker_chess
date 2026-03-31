"""
Game data models — Pydantic v2 schemas for API request/response
and SQLAlchemy ORM models for persistence.
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
import chess


class GameStatus(str, Enum):
    WAITING   = "waiting"
    ACTIVE    = "active"
    PAUSED    = "paused"
    COMPLETED = "completed"
    ABORTED   = "aborted"


class GameResult(str, Enum):
    WHITE_WIN  = "1-0"
    BLACK_WIN  = "0-1"
    DRAW       = "1/2-1/2"
    IN_PROGRESS= "*"


class TimeControlModel(BaseModel):
    base_seconds: int = Field(default=600, ge=0)
    increment_seconds: int = Field(default=0, ge=0)
    delay_seconds: int = Field(default=0, ge=0)

    def label(self) -> str:
        base_min = self.base_seconds // 60
        if self.increment_seconds:
            return f"{base_min}+{self.increment_seconds}"
        return f"{base_min} min"

    def category(self) -> str:
        total = self.base_seconds + 40 * self.increment_seconds
        if total < 180:
            return "bullet"
        if total < 900:
            return "blitz"
        if total < 3600:
            return "rapid"
        return "classical"


class MoveModel(BaseModel):
    uci: str = Field(..., description="Move in UCI format e.g. e2e4")
    san: Optional[str] = None
    fen_after: Optional[str] = None
    timestamp: Optional[datetime] = None
    time_spent_ms: Optional[int] = None
    eval_cp: Optional[int] = None

    @field_validator("uci")
    @classmethod
    def validate_uci(cls, v: str) -> str:
        try:
            chess.Move.from_uci(v)
        except ValueError as e:
            raise ValueError(f"Invalid UCI move: {v}") from e
        return v


class GameCreateRequest(BaseModel):
    white_player_id: str
    black_player_id: str
    time_control: TimeControlModel = Field(default_factory=TimeControlModel)
    rated: bool = True
    ai_strength: Optional[str] = None


class MoveRequest(BaseModel):
    game_id: str
    move_uci: str
    time_remaining_ms: Optional[int] = None

    @field_validator("move_uci")
    @classmethod
    def validate_move(cls, v: str) -> str:
        try:
            chess.Move.from_uci(v)
        except ValueError as e:
            raise ValueError(f"Invalid UCI move: {v}") from e
        return v


class GameStateResponse(BaseModel):
    game_id: str
    fen: str
    pgn: str
    status: GameStatus
    result: GameResult
    white_player_id: str
    black_player_id: str
    current_turn: str
    move_history: List[MoveModel]
    white_time_ms: int
    black_time_ms: int
    is_check: bool
    is_checkmate: bool
    is_stalemate: bool
    legal_moves: List[str]
    last_move: Optional[str] = None
    time_control: TimeControlModel


class AnalysisRequest(BaseModel):
    fen: str
    depth: int = Field(default=20, ge=1, le=40)
    time_limit_ms: float = Field(default=5000.0, ge=100.0, le=60000.0)
    multi_pv: int = Field(default=3, ge=1, le=10)

    @field_validator("fen")
    @classmethod
    def validate_fen(cls, v: str) -> str:
        try:
            chess.Board(v)
        except ValueError as e:
            raise ValueError(f"Invalid FEN: {v}") from e
        return v


class AnalysisLine(BaseModel):
    rank: int
    move: str
    score_cp: Optional[int] = None
    score_mate: Optional[int] = None
    depth: int
    pv: List[str]
    annotation: str


class AnalysisResponse(BaseModel):
    fen: str
    phase: str
    lines: List[AnalysisLine]
    book_moves: List[dict] = Field(default_factory=list)
    tablebase_wdl: Optional[str] = None
    static_eval_cp: int = 0


class AIMoveRequest(BaseModel):
    fen: str
    strength: str = Field(default="grandmaster")
    time_limit_ms: float = Field(default=5000.0, ge=100.0, le=30000.0)

    @field_validator("fen")
    @classmethod
    def validate_fen(cls, v: str) -> str:
        try:
            chess.Board(v)
        except ValueError as e:
            raise ValueError(f"Invalid FEN: {v}") from e
        return v

    @field_validator("strength")
    @classmethod
    def validate_strength(cls, v: str) -> str:
        from agents.search_agent import STRENGTH_PROFILES
        if v not in STRENGTH_PROFILES:
            raise ValueError(f"Invalid strength: {v}. Valid: {list(STRENGTH_PROFILES.keys())}")
        return v


class AIMoveResponse(BaseModel):
    move_uci: str
    move_san: str
    score_str: str
    depth: int
    nodes: int
    time_ms: float
    source: str
    pv: List[str]
    annotation: str
    fen_after: str
