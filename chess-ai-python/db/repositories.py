"""
Repository pattern — async data access for all entities.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import PlayerORM, GameORM, MoveORM, RatingHistoryORM, PuzzleORM, PuzzleAttemptORM


class PlayerRepo:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def create(self, username: str, display_name: str,
                     hashed_password: str, initial_rating: float = 1500.0) -> PlayerORM:
        player = PlayerORM(
            username=username,
            display_name=display_name,
            hashed_password=hashed_password,
            rating=initial_rating,
        )
        self._db.add(player)
        await self._db.flush()
        return player

    async def get_by_id(self, player_id: str) -> Optional[PlayerORM]:
        result = await self._db.execute(select(PlayerORM).where(PlayerORM.id == player_id))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[PlayerORM]:
        result = await self._db.execute(
            select(PlayerORM).where(PlayerORM.username == username)
        )
        return result.scalar_one_or_none()

    async def get_leaderboard(self, limit: int = 100, time_category: str = "classical") -> list[PlayerORM]:
        rating_col = {
            "rapid":  PlayerORM.rapid_rating,
            "blitz":  PlayerORM.blitz_rating,
            "bullet": PlayerORM.bullet_rating,
        }.get(time_category, PlayerORM.rating)
        result = await self._db.execute(
            select(PlayerORM)
            .where(PlayerORM.is_active == True)
            .order_by(desc(rating_col))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update_rating(self, player_id: str, new_rating: float,
                            delta: float, time_category: str = "classical",
                            game_id: Optional[str] = None,
                            opponent_id: Optional[str] = None,
                            result: Optional[str] = None):
        player = await self.get_by_id(player_id)
        if not player:
            return
        rating_map = {
            "classical": "rating",
            "rapid":     "rapid_rating",
            "blitz":     "blitz_rating",
            "bullet":    "bullet_rating",
        }
        setattr(player, rating_map.get(time_category, "rating"), new_rating)
        player.games_played += 1
        if result == "1-0" and player.id == game_id:
            player.wins += 1
        elif result == "0-1":
            player.losses += 1
        elif result in ("1/2-1/2", "draw"):
            player.draws += 1
        history = RatingHistoryORM(
            player_id=player_id, rating=new_rating, delta=delta,
            game_id=game_id, opponent_id=opponent_id,
            result=result, time_category=time_category,
        )
        self._db.add(history)
        await self._db.flush()

    async def get_rating_history(self, player_id: str,
                                  limit: int = 50) -> list[RatingHistoryORM]:
        result = await self._db.execute(
            select(RatingHistoryORM)
            .where(RatingHistoryORM.player_id == player_id)
            .order_by(desc(RatingHistoryORM.recorded_at))
            .limit(limit)
        )
        return list(result.scalars().all())


class GameRepo:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def create(self, white_id: str, black_id: str,
                     time_control: str = "600+0", rated: bool = True,
                     white_rating: float = 0.0, black_rating: float = 0.0) -> GameORM:
        game = GameORM(
            white_player_id=white_id,
            black_player_id=black_id,
            time_control=time_control,
            rated=rated,
            white_rating_before=white_rating,
            black_rating_before=black_rating,
        )
        self._db.add(game)
        await self._db.flush()
        return game

    async def get_by_id(self, game_id: str) -> Optional[GameORM]:
        result = await self._db.execute(
            select(GameORM).where(GameORM.id == game_id)
        )
        return result.scalar_one_or_none()

    async def get_player_games(self, player_id: str, limit: int = 20,
                                offset: int = 0) -> list[GameORM]:
        result = await self._db.execute(
            select(GameORM)
            .where(
                (GameORM.white_player_id == player_id) |
                (GameORM.black_player_id == player_id)
            )
            .order_by(desc(GameORM.created_at))
            .limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def finish(self, game_id: str, result: str, termination: str,
                     pgn: str, opening_eco: Optional[str] = None,
                     opening_name: Optional[str] = None,
                     annotations: Optional[dict] = None,
                     white_rating_after: Optional[float] = None,
                     black_rating_after: Optional[float] = None):
        game = await self.get_by_id(game_id)
        if not game:
            return
        game.result = result
        game.termination = termination
        game.pgn = pgn
        game.finished_at = datetime.utcnow()
        game.opening_eco = opening_eco
        game.opening_name = opening_name
        game.annotations = annotations
        if white_rating_after is not None:
            game.white_rating_after = white_rating_after
        if black_rating_after is not None:
            game.black_rating_after = black_rating_after
        await self._db.flush()

    async def add_move(self, game_id: str, move_number: int, uci: str,
                       san: str, fen_after: str, eval_cp: Optional[int] = None,
                       eval_mate: Optional[int] = None,
                       time_spent_ms: Optional[int] = None,
                       clock_remaining_ms: Optional[int] = None,
                       move_quality: Optional[str] = None):
        move = MoveORM(
            game_id=game_id, move_number=move_number, uci=uci, san=san,
            fen_after=fen_after, eval_cp=eval_cp, eval_mate=eval_mate,
            time_spent_ms=time_spent_ms, clock_remaining_ms=clock_remaining_ms,
            move_quality=move_quality,
        )
        self._db.add(move)
        await self._db.flush()

    async def get_opening_stats(self, eco_code: str) -> dict:
        result = await self._db.execute(
            select(
                func.count(GameORM.id).label("total"),
                func.sum(
                    func.case((GameORM.result == "1-0", 1), else_=0)
                ).label("white_wins"),
                func.sum(
                    func.case((GameORM.result == "0-1", 1), else_=0)
                ).label("black_wins"),
                func.sum(
                    func.case((GameORM.result == "1/2-1/2", 1), else_=0)
                ).label("draws"),
            )
            .where(GameORM.opening_eco == eco_code)
        )
        row = result.one()
        total = row.total or 1
        return {
            "eco": eco_code,
            "total_games": row.total or 0,
            "white_win_pct": round((row.white_wins or 0) / total * 100, 1),
            "black_win_pct": round((row.black_wins or 0) / total * 100, 1),
            "draw_pct": round((row.draws or 0) / total * 100, 1),
        }


class PuzzleRepo:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def get_for_player(self, player_puzzle_rating: int,
                              themes: Optional[list[str]] = None) -> Optional[PuzzleORM]:
        margin = 200
        query = (
            select(PuzzleORM)
            .where(
                and_(
                    PuzzleORM.rating >= player_puzzle_rating - margin,
                    PuzzleORM.rating <= player_puzzle_rating + margin,
                )
            )
            .order_by(func.random())
            .limit(1)
        )
        if themes:
            for theme in themes:
                query = query.where(PuzzleORM.themes.contains(theme))
        result = await self._db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id(self, puzzle_id: str) -> Optional[PuzzleORM]:
        result = await self._db.execute(
            select(PuzzleORM).where(PuzzleORM.id == puzzle_id)
        )
        return result.scalar_one_or_none()

    async def record_attempt(self, player_id: str, puzzle_id: str,
                              solved: bool, time_spent_ms: int,
                              rating_before: int, rating_after: int) -> PuzzleAttemptORM:
        attempt = PuzzleAttemptORM(
            player_id=player_id, puzzle_id=puzzle_id,
            solved=solved, time_spent_ms=time_spent_ms,
            rating_before=rating_before, rating_after=rating_after,
        )
        self._db.add(attempt)
        puzzle = await self.get_by_id(puzzle_id)
        if puzzle:
            puzzle.times_played += 1
            if solved:
                puzzle.times_solved += 1
        await self._db.flush()
        return attempt

    async def seed_puzzles(self, puzzles: list[dict]):
        """Bulk insert puzzles from Lichess CSV or custom source."""
        for p in puzzles:
            obj = PuzzleORM(
                fen=p["fen"],
                moves=p["moves"],
                rating=p.get("rating", 1500),
                themes=p.get("themes", ""),
                opening_eco=p.get("opening_eco"),
                opening_name=p.get("opening_name"),
            )
            self._db.add(obj)
        await self._db.flush()
