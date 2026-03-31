"""
Game history and annotation routes — retrieve saved games, PGN export,
annotation requests, and per-move quality breakdown.
"""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.repositories import GameRepo, PlayerRepo
from core.annotator import GameAnnotator
from api.auth import get_current_player

router = APIRouter(prefix="/api/history", tags=["History"])

_annotator: Optional[GameAnnotator] = None


def get_annotator() -> GameAnnotator:
    global _annotator
    if _annotator is None:
        _annotator = GameAnnotator(depth=12, time_per_move_ms=800)
    return _annotator


class AnnotationRequest(BaseModel):
    pgn: str
    depth: int = 12
    time_per_move_ms: float = 800.0


@router.get("/games/{player_id}")
async def get_player_games(
    player_id: str,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    repo = GameRepo(db)
    games = await repo.get_player_games(player_id, limit, offset)
    return [
        {
            "game_id": g.id,
            "white_id": g.white_player_id,
            "black_id": g.black_player_id,
            "result": g.result,
            "termination": g.termination,
            "time_control": g.time_control,
            "time_category": g.time_category,
            "opening_eco": g.opening_eco,
            "opening_name": g.opening_name,
            "total_moves": g.total_moves,
            "rated": g.rated,
            "white_rating_before": round(g.white_rating_before),
            "black_rating_before": round(g.black_rating_before),
            "white_rating_after": round(g.white_rating_after) if g.white_rating_after else None,
            "black_rating_after": round(g.black_rating_after) if g.black_rating_after else None,
            "created_at": g.created_at.isoformat(),
            "finished_at": g.finished_at.isoformat() if g.finished_at else None,
        }
        for g in games
    ]


@router.get("/games/{game_id}/pgn")
async def get_game_pgn(game_id: str, db: AsyncSession = Depends(get_db)):
    repo = GameRepo(db)
    game = await repo.get_by_id(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return {"game_id": game_id, "pgn": game.pgn or ""}


@router.get("/games/{game_id}/moves")
async def get_game_moves(game_id: str, db: AsyncSession = Depends(get_db)):
    repo = GameRepo(db)
    game = await repo.get_by_id(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return {
        "game_id": game_id,
        "moves": [
            {
                "move_number": m.move_number,
                "uci": m.uci,
                "san": m.san,
                "fen_after": m.fen_after,
                "eval_cp": m.eval_cp,
                "eval_mate": m.eval_mate,
                "time_spent_ms": m.time_spent_ms,
                "clock_remaining_ms": m.clock_remaining_ms,
                "quality": m.move_quality,
            }
            for m in game.moves
        ],
    }


@router.post("/annotate")
async def annotate_pgn(
    req: AnnotationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Annotate a PGN string with engine evaluations and move quality symbols.
    Returns immediately with annotations; heavy analysis runs synchronously for now.
    """
    annotator = GameAnnotator(depth=req.depth, time_per_move_ms=req.time_per_move_ms)
    try:
        annotations, annotated_pgn = annotator.annotate_game(req.pgn)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Annotation failed: {e}")

    summary = annotator.classify_moves(annotations)
    return {
        "annotated_pgn": annotated_pgn,
        "move_count": len(annotations),
        "summary": summary,
        "moves": [
            {
                "move_number": a.move_number,
                "uci": a.uci,
                "san": a.san,
                "eval_cp": a.eval_cp,
                "eval_mate": a.eval_mate,
                "best_move": a.best_move_uci,
                "delta_cp": a.delta_cp,
                "quality": a.quality,
                "symbol": a.quality_symbol,
                "comment": a.comment,
            }
            for a in annotations
        ],
    }


@router.get("/rating/{player_id}")
async def get_rating_history(
    player_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    repo = PlayerRepo(db)
    history = await repo.get_rating_history(player_id, limit)
    return {
        "player_id": player_id,
        "history": [
            {
                "rating": round(h.rating),
                "delta": round(h.delta, 1),
                "game_id": h.game_id,
                "opponent_id": h.opponent_id,
                "result": h.result,
                "time_category": h.time_category,
                "recorded_at": h.recorded_at.isoformat(),
            }
            for h in history
        ],
    }
