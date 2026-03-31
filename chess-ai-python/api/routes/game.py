"""
Game REST API routes — create, move, state, AI move, analysis.
"""
from __future__ import annotations
import uuid
import time
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
import chess
import chess.pgn
import io

from models.game import (
    GameCreateRequest, MoveRequest, GameStateResponse, GameResult,
    GameStatus, TimeControlModel, MoveModel, AIMoveRequest, AIMoveResponse,
    AnalysisRequest, AnalysisResponse, AnalysisLine,
)
from agents.orchestrator import ChessAIOrchestrator, OrchestratorConfig

router = APIRouter(prefix="/api/games", tags=["Games"])

_GAMES: dict[str, dict] = {}
_ORCHESTRATOR: Optional[ChessAIOrchestrator] = None


def get_orchestrator() -> ChessAIOrchestrator:
    global _ORCHESTRATOR
    if _ORCHESTRATOR is None:
        _ORCHESTRATOR = ChessAIOrchestrator(OrchestratorConfig(
            strength="grandmaster",
            tt_size_mb=128,
            use_opening_book=True,
            use_endgame_tb=True,
        ))
    return _ORCHESTRATOR


def _board_to_pgn(game_data: dict) -> str:
    game = chess.pgn.Game()
    game.headers["White"] = game_data["white_player_id"]
    game.headers["Black"] = game_data["black_player_id"]
    game.headers["Result"] = game_data["result"]
    node = game
    for move_uci in game_data["move_history_uci"]:
        move = chess.Move.from_uci(move_uci)
        node = node.add_variation(move)
    exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
    return game.accept(exporter)


def _build_state_response(game_id: str, game_data: dict) -> GameStateResponse:
    board: chess.Board = game_data["board"]
    moves = [
        MoveModel(uci=m["uci"], san=m.get("san"), fen_after=m.get("fen_after"))
        for m in game_data["moves"]
    ]
    legal_moves = [m.uci() for m in board.legal_moves]
    last_move = game_data["move_history_uci"][-1] if game_data["move_history_uci"] else None
    return GameStateResponse(
        game_id=game_id,
        fen=board.fen(),
        pgn=_board_to_pgn(game_data),
        status=game_data["status"],
        result=game_data["result"],
        white_player_id=game_data["white_player_id"],
        black_player_id=game_data["black_player_id"],
        current_turn="white" if board.turn == chess.WHITE else "black",
        move_history=moves,
        white_time_ms=game_data["white_time_ms"],
        black_time_ms=game_data["black_time_ms"],
        is_check=board.is_check(),
        is_checkmate=board.is_checkmate(),
        is_stalemate=board.is_stalemate(),
        legal_moves=legal_moves,
        last_move=last_move,
        time_control=game_data["time_control"],
    )


@router.post("/create", response_model=GameStateResponse)
async def create_game(req: GameCreateRequest):
    game_id = str(uuid.uuid4())
    board = chess.Board()
    base_ms = req.time_control.base_seconds * 1000

    _GAMES[game_id] = {
        "board": board,
        "white_player_id": req.white_player_id,
        "black_player_id": req.black_player_id,
        "status": GameStatus.ACTIVE,
        "result": GameResult.IN_PROGRESS,
        "moves": [],
        "move_history_uci": [],
        "white_time_ms": base_ms,
        "black_time_ms": base_ms,
        "time_control": req.time_control,
        "rated": req.rated,
        "ai_strength": req.ai_strength,
        "created_at": time.time(),
        "last_move_at": time.time(),
    }
    return _build_state_response(game_id, _GAMES[game_id])


@router.post("/{game_id}/move", response_model=GameStateResponse)
async def make_move(game_id: str, req: MoveRequest):
    game_data = _GAMES.get(game_id)
    if not game_data:
        raise HTTPException(status_code=404, detail="Game not found")
    if game_data["status"] != GameStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Game is not active")

    board: chess.Board = game_data["board"]
    try:
        move = chess.Move.from_uci(req.move_uci)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid UCI: {req.move_uci}")

    if move not in board.legal_moves:
        raise HTTPException(status_code=400, detail="Illegal move")

    san = board.san(move)
    fen_before = board.fen()
    board.push(move)
    fen_after = board.fen()

    # Time update
    now = time.time()
    elapsed_ms = int((now - game_data["last_move_at"]) * 1000)
    tc: TimeControlModel = game_data["time_control"]
    if board.turn == chess.BLACK:
        game_data["white_time_ms"] = max(
            0, game_data["white_time_ms"] - elapsed_ms + tc.increment_seconds * 1000
        )
    else:
        game_data["black_time_ms"] = max(
            0, game_data["black_time_ms"] - elapsed_ms + tc.increment_seconds * 1000
        )
    game_data["last_move_at"] = now

    game_data["moves"].append({"uci": req.move_uci, "san": san, "fen_after": fen_after})
    game_data["move_history_uci"].append(req.move_uci)

    # Check game termination
    if board.is_checkmate():
        game_data["status"] = GameStatus.COMPLETED
        game_data["result"] = (GameResult.WHITE_WIN
                               if board.turn == chess.BLACK else GameResult.BLACK_WIN)
    elif (board.is_stalemate() or board.is_insufficient_material()
          or board.is_seventyfive_moves() or board.is_fivefold_repetition()):
        game_data["status"] = GameStatus.COMPLETED
        game_data["result"] = GameResult.DRAW

    return _build_state_response(game_id, game_data)


@router.get("/{game_id}", response_model=GameStateResponse)
async def get_game(game_id: str):
    game_data = _GAMES.get(game_id)
    if not game_data:
        raise HTTPException(status_code=404, detail="Game not found")
    return _build_state_response(game_id, game_data)


@router.post("/{game_id}/resign")
async def resign(game_id: str, player_id: str):
    game_data = _GAMES.get(game_id)
    if not game_data:
        raise HTTPException(status_code=404, detail="Game not found")
    if game_data["status"] != GameStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Game is not active")
    if player_id == game_data["white_player_id"]:
        game_data["result"] = GameResult.BLACK_WIN
    elif player_id == game_data["black_player_id"]:
        game_data["result"] = GameResult.WHITE_WIN
    else:
        raise HTTPException(status_code=400, detail="Player not in this game")
    game_data["status"] = GameStatus.COMPLETED
    return {"result": game_data["result"]}


@router.post("/{game_id}/draw-offer")
async def offer_draw(game_id: str, player_id: str, accept: bool = False):
    game_data = _GAMES.get(game_id)
    if not game_data:
        raise HTTPException(status_code=404, detail="Game not found")
    if accept:
        game_data["status"] = GameStatus.COMPLETED
        game_data["result"] = GameResult.DRAW
        return {"result": "Draw agreed", "game_result": GameResult.DRAW}
    return {"result": "Draw offered — waiting for opponent"}


@router.post("/ai-move", response_model=AIMoveResponse)
async def ai_move(req: AIMoveRequest, orchestrator: ChessAIOrchestrator = Depends(get_orchestrator)):
    try:
        board = chess.Board(req.fen)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {e}")

    orchestrator.set_strength(req.strength)
    try:
        decision = orchestrator.get_best_move(board, req.time_limit_ms)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    san = board.san(decision.move)
    board.push(decision.move)
    return AIMoveResponse(
        move_uci=decision.uci(),
        move_san=san,
        score_str=decision.score_str(),
        depth=decision.depth,
        nodes=decision.nodes,
        time_ms=decision.time_ms,
        source=decision.source,
        pv=[m.uci() for m in decision.pv],
        annotation=decision.annotation,
        fen_after=board.fen(),
    )


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_position(
    req: AnalysisRequest,
    orchestrator: ChessAIOrchestrator = Depends(get_orchestrator)
):
    try:
        board = chess.Board(req.fen)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {e}")

    phase = orchestrator.detect_phase(board).value
    static_eval = orchestrator.get_static_eval(board)
    book_moves = orchestrator.get_opening_moves(board)
    tb_wdl = orchestrator.get_endgame_wdl(board)

    lines: list[AnalysisLine] = []
    from agents.search_agent import SearchAgent, STRENGTH_PROFILES
    from agents.base_agent import AgentConfig
    from core.evaluator import MATE_SCORE

    agent_cfg = AgentConfig(name="analyzer", max_depth=req.depth,
                            time_limit_ms=req.time_limit_ms)
    analyst = SearchAgent(agent_cfg, "super_gm")

    for i in range(min(req.multi_pv, 3)):
        decision = analyst.select_move(board, req.time_limit_ms)
        if not decision:
            break
        score_cp = None
        score_mate = None
        if abs(decision.score) > 90_000:
            score_mate = (100_000 - abs(decision.score) + 1) // 2
            if decision.score < 0:
                score_mate = -score_mate
        else:
            score_cp = decision.score

        lines.append(AnalysisLine(
            rank=i + 1,
            move=decision.uci(),
            score_cp=score_cp,
            score_mate=score_mate,
            depth=decision.depth,
            pv=[m.uci() for m in decision.pv],
            annotation=decision.annotation,
        ))

        if i < req.multi_pv - 1 and decision.move in board.legal_moves:
            board2 = board.copy()
            board2.push(decision.move)

    return AnalysisResponse(
        fen=req.fen,
        phase=phase,
        lines=lines,
        book_moves=book_moves,
        tablebase_wdl=tb_wdl,
        static_eval_cp=static_eval,
    )
