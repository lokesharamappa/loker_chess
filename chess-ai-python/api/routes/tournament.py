"""
Tournament REST API routes — create, manage, pair rounds, record results.
"""
from __future__ import annotations
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from fide.tournament import (
    SwissTournament, TournamentConfig, TournamentFormat,
    TimeControl, GameResult as TourneyResult,
)
from fide.rating import FIDERatingCalculator, PlayerRating, EloLeaderboard

router = APIRouter(prefix="/api/tournaments", tags=["Tournaments"])

_TOURNAMENTS: dict[str, SwissTournament] = {}
_LEADERBOARD = EloLeaderboard()


class CreateTournamentRequest(BaseModel):
    name: str
    format: str = "swiss"
    time_control: str = "classical"
    rounds: int = Field(default=9, ge=1, le=15)
    max_players: int = Field(default=64, ge=2, le=256)
    rated: bool = True


class RegisterPlayerRequest(BaseModel):
    player_id: str
    name: str
    rating: float = Field(default=1500.0, ge=100.0, le=3500.0)


class RecordResultRequest(BaseModel):
    white_id: str
    black_id: str
    result: str = Field(..., description="One of: 1-0, 0-1, 1/2-1/2, W, L, BYE")


class TournamentStatusResponse(BaseModel):
    tournament_id: str
    name: str
    format: str
    current_round: int
    total_rounds: int
    player_count: int
    is_finished: bool
    standings: list[dict]


def _parse_result(result_str: str) -> TourneyResult:
    mapping = {
        "1-0":     TourneyResult.WHITE_WIN,
        "0-1":     TourneyResult.BLACK_WIN,
        "1/2-1/2": TourneyResult.DRAW,
        "W":       TourneyResult.FORFEIT_W,
        "L":       TourneyResult.FORFEIT_L,
        "BYE":     TourneyResult.BYE,
    }
    r = mapping.get(result_str)
    if r is None:
        raise HTTPException(status_code=400, detail=f"Invalid result: {result_str}")
    return r


def _standing_to_dict(rank: int, player) -> dict:
    return {
        "rank": rank,
        "player_id": player.player_id,
        "name": player.name,
        "rating": round(player.rating),
        "score": player.score,
        "games_played": player.games_played,
        "buchholz": round(player.buchholz, 1),
        "sonneborn_berger": round(player.sonneborn_berger, 1),
    }


@router.post("/create", response_model=dict)
async def create_tournament(req: CreateTournamentRequest):
    fmt_map = {
        "swiss":       TournamentFormat.SWISS,
        "round_robin": TournamentFormat.ROUND_ROBIN,
        "knockout":    TournamentFormat.KNOCKOUT,
    }
    tc_map = {
        "bullet":    TimeControl.BULLET,
        "blitz":     TimeControl.BLITZ,
        "rapid":     TimeControl.RAPID,
        "classical": TimeControl.CLASSICAL,
    }
    tournament_id = str(uuid.uuid4())
    config = TournamentConfig(
        name=req.name,
        format=fmt_map.get(req.format, TournamentFormat.SWISS),
        time_control=tc_map.get(req.time_control, TimeControl.CLASSICAL),
        rounds=req.rounds,
        max_players=req.max_players,
        rated=req.rated,
    )
    _TOURNAMENTS[tournament_id] = SwissTournament(config)
    return {"tournament_id": tournament_id, "name": req.name, "status": "created"}


@router.post("/{tournament_id}/register")
async def register_player(tournament_id: str, req: RegisterPlayerRequest):
    t = _TOURNAMENTS.get(tournament_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    success = t.register_player(req.player_id, req.name, req.rating)
    if not success:
        raise HTTPException(status_code=400, detail="Registration failed (full or closed)")
    return {"status": "registered", "player_id": req.player_id}


@router.post("/{tournament_id}/start-round")
async def start_round(tournament_id: str):
    t = _TOURNAMENTS.get(tournament_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    try:
        pairings = t.start_round()
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "round": t.current_round,
        "pairings": [
            {
                "white": p.white_id,
                "black": p.black_id,
                "result": p.result.value if p.result else None,
            }
            for p in pairings
        ],
    }


@router.post("/{tournament_id}/result")
async def record_result(tournament_id: str, round_number: int, req: RecordResultRequest):
    t = _TOURNAMENTS.get(tournament_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    result = _parse_result(req.result)
    try:
        t.record_result(round_number, req.white_id, req.black_id, result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "recorded", "result": req.result}


@router.get("/{tournament_id}", response_model=TournamentStatusResponse)
async def get_tournament(tournament_id: str):
    t = _TOURNAMENTS.get(tournament_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    standings = t.get_standings()
    return TournamentStatusResponse(
        tournament_id=tournament_id,
        name=t._config.name,
        format=t._config.format.value,
        current_round=t.current_round,
        total_rounds=t.total_rounds,
        player_count=len(t._players),
        is_finished=t.is_finished(),
        standings=[_standing_to_dict(i + 1, p) for i, p in enumerate(standings)],
    )


@router.get("/{tournament_id}/rounds/{round_number}")
async def get_round_pairings(tournament_id: str, round_number: int):
    t = _TOURNAMENTS.get(tournament_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    pairings = t.get_round_pairings(round_number)
    return {
        "round": round_number,
        "pairings": [
            {
                "white": p.white_id,
                "black": p.black_id,
                "result": p.result.value if p.result else "pending",
            }
            for p in pairings
        ],
    }


@router.get("/{tournament_id}/crosstable")
async def get_crosstable(tournament_id: str):
    t = _TOURNAMENTS.get(tournament_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"crosstable": t.export_crosstable()}


@router.post("/rating/update")
async def update_rating(
    player_id: str,
    initial_rating: float,
    opponent_ratings: list[float],
    scores: list[float],
    time_control: str = "classical",
):
    player = PlayerRating(
        player_id=player_id,
        rating=initial_rating,
        games_played=30,
    )
    result = FIDERatingCalculator.update_rating(
        player, opponent_ratings, scores, time_control
    )
    return {
        "player_id": result.player_id,
        "old_rating": round(result.old_rating),
        "new_rating": round(result.new_rating),
        "delta": round(result.delta, 1),
        "performance_rating": round(result.performance_rating),
    }
