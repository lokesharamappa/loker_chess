"""
Game history and annotation routes — retrieve saved games, PGN export,
annotation requests, and per-move quality breakdown.
"""
from __future__ import annotations
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import chess as chess_lib
import chess.pgn as chess_pgn

from db.database import get_db
from db.repositories import GameRepo, PlayerRepo
from db.models import PlayerORM
from core.annotator import GameAnnotator
from api.auth import get_current_player

_AI_PLAYER_ID = "00000000-0000-0000-0000-000000000001"


class QuickSaveRequest(BaseModel):
    moves_uci: List[str]
    result: str = "*"
    termination: str = "normal"
    player_color: str = "white"
    time_control: str = "5+0"
    time_category: str = "blitz"
    session_id: Optional[str] = None


class QuickSaveResponse(BaseModel):
    game_id: str
    session_id: str

router = APIRouter(prefix="/api/history", tags=["History"])

_annotator: Optional[GameAnnotator] = None


async def _ensure_player(db: AsyncSession, player_id: str, display_name: str, rating: float = 1500.0) -> PlayerORM:
    repo = PlayerRepo(db)
    player = await repo.get_by_id(player_id)
    if not player:
        p = PlayerORM(
            id=player_id,
            username=f"guest_{player_id[:8]}",
            display_name=display_name,
            hashed_password=hashlib.sha256(player_id.encode()).hexdigest(),
            rating=rating,
        )
        db.add(p)
        await db.flush()
    return player  # type: ignore


def get_annotator() -> GameAnnotator:
    global _annotator
    if _annotator is None:
        _annotator = GameAnnotator(depth=12, time_per_move_ms=800)
    return _annotator


class AnnotationRequest(BaseModel):
    pgn: str
    depth: int = 12
    time_per_move_ms: float = 800.0


@router.post("/quick-save", response_model=QuickSaveResponse)
async def quick_save_game(req: QuickSaveRequest, db: AsyncSession = Depends(get_db)):
    """
    Save a completed game without requiring authentication.
    Creates a guest player keyed by session_id (persisted in browser localStorage).
    Returns game_id and session_id for future history lookups.
    """
    session_id = req.session_id or str(uuid.uuid4())

    # Ensure both players exist in DB
    await _ensure_player(db, session_id, "Player", 1500.0)
    await _ensure_player(db, _AI_PLAYER_ID, "Chess AI", 2800.0)

    white_id = session_id if req.player_color == "white" else _AI_PLAYER_ID
    black_id = _AI_PLAYER_ID if req.player_color == "white" else session_id
    white_rating = 1500.0 if req.player_color == "white" else 2800.0
    black_rating = 2800.0 if req.player_color == "white" else 1500.0

    # Detect opening from first moves
    opening_eco: Optional[str] = None
    opening_name: Optional[str] = None
    try:
        from core.opening_explorer import OpeningClassifier
        classifier = OpeningClassifier()
        entry = classifier.classify_from_moves(req.moves_uci[:14])
        if entry:
            opening_eco = entry.eco
            opening_name = entry.name
    except Exception:
        pass

    # Create game record
    game_repo = GameRepo(db)
    game = await game_repo.create(
        white_id=white_id, black_id=black_id,
        time_control=req.time_control, rated=False,
        white_rating=white_rating, black_rating=black_rating,
    )

    # Replay moves, compute SAN + FEN for each
    board = chess_lib.Board()
    pgn_game = chess_pgn.Game()
    pgn_game.headers["Result"] = req.result
    node = pgn_game
    saved = 0
    for i, uci in enumerate(req.moves_uci):
        try:
            move = chess_lib.Move.from_uci(uci)
            san = board.san(move)
            node = node.add_variation(move)
            board.push(move)
            fen_after = board.fen()
            await game_repo.add_move(
                game_id=game.id,
                move_number=i + 1,
                uci=uci,
                san=san,
                fen_after=fen_after,
            )
            saved += 1
        except Exception:
            break

    # Export PGN
    exporter = chess_pgn.StringExporter(headers=True, variations=False, comments=False)
    pgn_str = pgn_game.accept(exporter)

    # Finish game
    game.result = req.result
    game.termination = req.termination
    game.total_moves = saved
    game.opening_eco = opening_eco
    game.opening_name = opening_name
    game.pgn = pgn_str
    game.finished_at = datetime.now(timezone.utc)

    await db.commit()
    return QuickSaveResponse(game_id=game.id, session_id=session_id)


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
