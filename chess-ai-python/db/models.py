"""
SQLAlchemy ORM models for persistent storage.
Tables: players, games, moves, rating_history, puzzles, puzzle_attempts.
"""
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, Index, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class PlayerORM(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(64), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=1500.0)
    rapid_rating: Mapped[float] = mapped_column(Float, default=1500.0)
    blitz_rating: Mapped[float] = mapped_column(Float, default=1500.0)
    bullet_rating: Mapped[float] = mapped_column(Float, default=1500.0)
    title: Mapped[str] = mapped_column(String(8), default="None")
    games_played: Mapped[int] = mapped_column(Integer, default=0)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    draws: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    puzzle_rating: Mapped[int] = mapped_column(Integer, default=1200)
    puzzles_solved: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    games_as_white: Mapped[list["GameORM"]] = relationship(
        "GameORM", foreign_keys="GameORM.white_player_id", back_populates="white_player"
    )
    games_as_black: Mapped[list["GameORM"]] = relationship(
        "GameORM", foreign_keys="GameORM.black_player_id", back_populates="black_player"
    )
    rating_history: Mapped[list["RatingHistoryORM"]] = relationship(
        "RatingHistoryORM", back_populates="player"
    )
    puzzle_attempts: Mapped[list["PuzzleAttemptORM"]] = relationship(
        "PuzzleAttemptORM", back_populates="player"
    )


class GameORM(Base):
    __tablename__ = "games"
    __table_args__ = (
        Index("ix_games_white", "white_player_id"),
        Index("ix_games_black", "black_player_id"),
        Index("ix_games_created", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    white_player_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("players.id"), nullable=False
    )
    black_player_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("players.id"), nullable=False
    )
    result: Mapped[str] = mapped_column(String(8), default="*")
    termination: Mapped[str] = mapped_column(String(32), default="in_progress")
    time_control: Mapped[str] = mapped_column(String(32), default="600+0")
    time_category: Mapped[str] = mapped_column(String(16), default="rapid")
    rated: Mapped[bool] = mapped_column(Boolean, default=True)
    white_rating_before: Mapped[float] = mapped_column(Float, default=0.0)
    black_rating_before: Mapped[float] = mapped_column(Float, default=0.0)
    white_rating_after: Mapped[float] = mapped_column(Float, nullable=True)
    black_rating_after: Mapped[float] = mapped_column(Float, nullable=True)
    opening_eco: Mapped[str] = mapped_column(String(8), nullable=True)
    opening_name: Mapped[str] = mapped_column(String(128), nullable=True)
    pgn: Mapped[str] = mapped_column(Text, nullable=True)
    annotations: Mapped[dict] = mapped_column(JSON, nullable=True)
    total_moves: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    white_player: Mapped["PlayerORM"] = relationship(
        "PlayerORM", foreign_keys=[white_player_id], back_populates="games_as_white"
    )
    black_player: Mapped["PlayerORM"] = relationship(
        "PlayerORM", foreign_keys=[black_player_id], back_populates="games_as_black"
    )
    moves: Mapped[list["MoveORM"]] = relationship(
        "MoveORM", back_populates="game", order_by="MoveORM.move_number"
    )


class MoveORM(Base):
    __tablename__ = "moves"
    __table_args__ = (Index("ix_moves_game", "game_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(36), ForeignKey("games.id"), nullable=False)
    move_number: Mapped[int] = mapped_column(Integer, nullable=False)
    uci: Mapped[str] = mapped_column(String(8), nullable=False)
    san: Mapped[str] = mapped_column(String(16), nullable=False)
    fen_after: Mapped[str] = mapped_column(String(100), nullable=False)
    eval_cp: Mapped[int] = mapped_column(Integer, nullable=True)
    eval_mate: Mapped[int] = mapped_column(Integer, nullable=True)
    time_spent_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    clock_remaining_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    move_quality: Mapped[str] = mapped_column(String(16), nullable=True)

    game: Mapped["GameORM"] = relationship("GameORM", back_populates="moves")


class RatingHistoryORM(Base):
    __tablename__ = "rating_history"
    __table_args__ = (Index("ix_rh_player_date", "player_id", "recorded_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"), nullable=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    delta: Mapped[float] = mapped_column(Float, default=0.0)
    game_id: Mapped[str] = mapped_column(String(36), nullable=True)
    opponent_id: Mapped[str] = mapped_column(String(36), nullable=True)
    result: Mapped[str] = mapped_column(String(8), nullable=True)
    time_category: Mapped[str] = mapped_column(String(16), default="classical")
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    player: Mapped["PlayerORM"] = relationship("PlayerORM", back_populates="rating_history")


class PuzzleORM(Base):
    __tablename__ = "puzzles"
    __table_args__ = (
        Index("ix_puzzles_rating", "rating"),
        Index("ix_puzzles_theme", "themes"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    fen: Mapped[str] = mapped_column(String(100), nullable=False)
    moves: Mapped[str] = mapped_column(String(256), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, default=1500)
    rating_deviation: Mapped[int] = mapped_column(Integer, default=80)
    themes: Mapped[str] = mapped_column(String(256), default="")
    opening_eco: Mapped[str] = mapped_column(String(8), nullable=True)
    opening_name: Mapped[str] = mapped_column(String(128), nullable=True)
    source_game_id: Mapped[str] = mapped_column(String(36), nullable=True)
    times_played: Mapped[int] = mapped_column(Integer, default=0)
    times_solved: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    attempts: Mapped[list["PuzzleAttemptORM"]] = relationship(
        "PuzzleAttemptORM", back_populates="puzzle"
    )

    @property
    def solve_rate(self) -> float:
        return self.times_solved / self.times_played if self.times_played > 0 else 0.0


class PuzzleAttemptORM(Base):
    __tablename__ = "puzzle_attempts"
    __table_args__ = (Index("ix_pa_player_puzzle", "player_id", "puzzle_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"), nullable=False)
    puzzle_id: Mapped[str] = mapped_column(String(36), ForeignKey("puzzles.id"), nullable=False)
    solved: Mapped[bool] = mapped_column(Boolean, nullable=False)
    time_spent_ms: Mapped[int] = mapped_column(Integer, default=0)
    rating_before: Mapped[int] = mapped_column(Integer, default=1200)
    rating_after: Mapped[int] = mapped_column(Integer, default=1200)
    attempted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    player: Mapped["PlayerORM"] = relationship("PlayerORM", back_populates="puzzle_attempts")
    puzzle: Mapped["PuzzleORM"] = relationship("PuzzleORM", back_populates="attempts")
