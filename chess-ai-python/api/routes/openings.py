"""
Opening Explorer routes — ECO lookup, move statistics, opening tree.
"""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import chess

from db.database import get_db
from db.repositories import GameRepo
from core.opening_explorer import get_classifier

router = APIRouter(prefix="/api/openings", tags=["Openings"])


@router.get("/classify")
async def classify_position(fen: str):
    """Classify a FEN position by ECO code."""
    try:
        board = chess.Board(fen)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid FEN")
    classifier = get_classifier()
    entry = classifier.classify(board)
    if not entry:
        return {"eco": "A00", "name": "Uncommon Opening", "moves": ""}
    return {"eco": entry.eco, "name": entry.name, "moves": entry.pgn_moves}


@router.get("/classify-moves")
async def classify_from_moves(moves: str):
    """
    Classify a sequence of UCI moves (space-separated).
    e.g. moves=e2e4 e7e5 g1f3
    """
    uci_list = moves.strip().split()
    classifier = get_classifier()
    entry = classifier.classify_from_moves(uci_list)
    if not entry:
        return {"eco": "A00", "name": "Uncommon Opening", "moves": ""}
    return {"eco": entry.eco, "name": entry.name, "moves": entry.pgn_moves}


@router.get("/eco/{eco_code}")
async def get_by_eco(eco_code: str, db: AsyncSession = Depends(get_db)):
    """Get opening info + platform statistics for an ECO code."""
    classifier = get_classifier()
    entry = classifier.get_by_eco(eco_code.upper())
    if not entry:
        raise HTTPException(status_code=404, detail=f"ECO code {eco_code} not found")
    game_repo = GameRepo(db)
    stats = await game_repo.get_opening_stats(eco_code.upper())
    return {
        "eco": entry.eco,
        "name": entry.name,
        "moves": entry.pgn_moves,
        "stats": stats,
    }


@router.get("/search")
async def search_openings(q: str, limit: int = 10):
    """Search openings by name."""
    classifier = get_classifier()
    results = classifier.search_by_name(q, limit)
    return [{"eco": e.eco, "name": e.name, "moves": e.pgn_moves} for e in results]


@router.get("/all")
async def list_all_openings():
    """Return all ECO codes with names."""
    classifier = get_classifier()
    return classifier.all_openings()


@router.get("/explorer")
async def opening_explorer(fen: str, db: AsyncSession = Depends(get_db)):
    """
    Full opening explorer for a position:
    - ECO classification
    - Book moves (if available)
    - Platform game statistics
    """
    try:
        board = chess.Board(fen)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid FEN")

    classifier = get_classifier()
    entry = classifier.classify(board)

    from agents.opening_agent import OpeningAgent
    from agents.base_agent import AgentConfig
    agent = OpeningAgent(AgentConfig(name="explorer"))
    book_moves = agent.get_all_book_moves(board)
    agent.close()

    stats = None
    if entry:
        game_repo = GameRepo(db)
        stats = await game_repo.get_opening_stats(entry.eco)

    return {
        "fen": fen,
        "classification": {
            "eco": entry.eco if entry else "A00",
            "name": entry.name if entry else "Uncommon Opening",
        } if entry else None,
        "book_moves": book_moves,
        "platform_stats": stats,
    }
