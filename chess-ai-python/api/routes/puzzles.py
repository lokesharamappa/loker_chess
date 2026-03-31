"""
Puzzle system routes — fetch, solve, rate, and track tactical puzzles.
Uses a Glicko-inspired rating for both player and puzzle.
"""
from __future__ import annotations
import math
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
import chess

from db.database import get_db
from db.repositories import PuzzleRepo, PlayerRepo
from api.auth import get_current_player

router = APIRouter(prefix="/api/puzzles", tags=["Puzzles"])

K_PLAYER = 32
K_PUZZLE = 16


class PuzzleResponse(BaseModel):
    puzzle_id: str
    fen: str
    side_to_move: str
    rating: int
    themes: list[str]
    opening_eco: Optional[str] = None
    opening_name: Optional[str] = None


class SolveAttempt(BaseModel):
    moves_played: list[str] = Field(..., description="UCI moves attempted by player")
    time_spent_ms: int = Field(default=0, ge=0)


class SolveResult(BaseModel):
    correct: bool
    solution: list[str]
    player_rating_before: int
    player_rating_after: int
    puzzle_rating: int
    delta: int
    themes: list[str]
    explanation: str


def _glicko_delta(player_r: int, puzzle_r: int, solved: bool, k: int = K_PLAYER) -> int:
    expected = 1.0 / (1.0 + 10 ** ((puzzle_r - player_r) / 400.0))
    actual = 1.0 if solved else 0.0
    return int(k * (actual - expected))


def _parse_themes(themes_str: str) -> list[str]:
    return [t.strip() for t in themes_str.split() if t.strip()]


@router.get("/next", response_model=PuzzleResponse)
async def get_next_puzzle(
    theme: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    player=Depends(get_current_player),
):
    repo = PuzzleRepo(db)
    themes = [theme] if theme else None
    puzzle = await repo.get_for_player(player.puzzle_rating, themes)
    if not puzzle:
        raise HTTPException(status_code=404, detail="No puzzles available at your rating level")
    return PuzzleResponse(
        puzzle_id=puzzle.id,
        fen=puzzle.fen,
        side_to_move="white" if chess.Board(puzzle.fen).turn == chess.WHITE else "black",
        rating=puzzle.rating,
        themes=_parse_themes(puzzle.themes),
        opening_eco=puzzle.opening_eco,
        opening_name=puzzle.opening_name,
    )


@router.post("/{puzzle_id}/solve", response_model=SolveResult)
async def solve_puzzle(
    puzzle_id: str,
    attempt: SolveAttempt,
    db: AsyncSession = Depends(get_db),
    player=Depends(get_current_player),
):
    repo = PuzzleRepo(db)
    puzzle = await repo.get_by_id(puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")

    solution = puzzle.moves.split()
    played = attempt.moves_played

    correct = _check_solution(played, solution, puzzle.fen)

    player_before = player.puzzle_rating
    delta = _glicko_delta(player_before, puzzle.rating, correct)
    player_after = max(400, player_before + delta)

    player.puzzle_rating = player_after
    if correct:
        player.puzzles_solved += 1

    await repo.record_attempt(
        player_id=player.id,
        puzzle_id=puzzle_id,
        solved=correct,
        time_spent_ms=attempt.time_spent_ms,
        rating_before=player_before,
        rating_after=player_after,
    )

    themes = _parse_themes(puzzle.themes)
    explanation = _build_explanation(correct, solution, puzzle.fen, themes)

    return SolveResult(
        correct=correct,
        solution=solution,
        player_rating_before=player_before,
        player_rating_after=player_after,
        puzzle_rating=puzzle.rating,
        delta=delta,
        themes=themes,
        explanation=explanation,
    )


@router.get("/{puzzle_id}", response_model=PuzzleResponse)
async def get_puzzle(puzzle_id: str, db: AsyncSession = Depends(get_db)):
    repo = PuzzleRepo(db)
    puzzle = await repo.get_by_id(puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    return PuzzleResponse(
        puzzle_id=puzzle.id,
        fen=puzzle.fen,
        side_to_move="white" if chess.Board(puzzle.fen).turn == chess.WHITE else "black",
        rating=puzzle.rating,
        themes=_parse_themes(puzzle.themes),
        opening_eco=puzzle.opening_eco,
        opening_name=puzzle.opening_name,
    )


@router.post("/seed")
async def seed_puzzles(puzzles: list[dict], db: AsyncSession = Depends(get_db)):
    """Bulk insert puzzles. Each dict needs: fen, moves, rating, themes."""
    repo = PuzzleRepo(db)
    await repo.seed_puzzles(puzzles)
    return {"seeded": len(puzzles)}


def _check_solution(played: list[str], solution: list[str], fen: str) -> bool:
    """
    Verify played moves match the solution.
    For multi-move puzzles the player plays odd moves (1st, 3rd…),
    engine responds with even moves from the solution.
    """
    if not played:
        return False
    board = chess.Board(fen)
    sol_idx = 0
    player_idx = 0
    while sol_idx < len(solution):
        expected = solution[sol_idx]
        try:
            expected_move = chess.Move.from_uci(expected)
        except ValueError:
            break
        if player_idx >= len(played):
            return False
        try:
            player_move = chess.Move.from_uci(played[player_idx])
        except ValueError:
            return False
        if player_move != expected_move or player_move not in board.legal_moves:
            return False
        board.push(player_move)
        player_idx += 1
        sol_idx += 1
        if sol_idx < len(solution):
            try:
                engine_move = chess.Move.from_uci(solution[sol_idx])
                if engine_move in board.legal_moves:
                    board.push(engine_move)
                sol_idx += 1
            except ValueError:
                break
    return True


def _build_explanation(correct: bool, solution: list[str],
                        fen: str, themes: list[str]) -> str:
    theme_str = ", ".join(themes) if themes else "tactics"
    if correct:
        return f"Correct! This puzzle features: {theme_str}. Solution: {' '.join(solution)}"
    board = chess.Board(fen)
    san_moves = []
    for uci in solution:
        try:
            m = chess.Move.from_uci(uci)
            if m in board.legal_moves:
                san_moves.append(board.san(m))
                board.push(m)
        except Exception:
            break
    return f"Incorrect. The correct solution was: {' '.join(san_moves)} — Theme: {theme_str}"
