"""
WebSocket handlers for real-time chess gameplay.
Supports: live moves, clock sync, spectator broadcast, chat.
"""
from __future__ import annotations
import json
import time
import asyncio
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
import chess

from agents.orchestrator import ChessAIOrchestrator, OrchestratorConfig

_SESSIONS: dict[str, dict] = {}
_SPECTATORS: dict[str, list[WebSocket]] = {}

_ORCHESTRATOR = ChessAIOrchestrator(OrchestratorConfig(
    strength="grandmaster",
    tt_size_mb=128,
    use_opening_book=True,
    use_endgame_tb=True,
))


async def _broadcast(game_id: str, message: dict):
    """Broadcast message to all spectators of a game."""
    spectators = _SPECTATORS.get(game_id, [])
    disconnected = []
    for ws in spectators:
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        spectators.remove(ws)


async def handle_player_connection(websocket: WebSocket, game_id: str, player_id: str):
    """Handle a player WebSocket connection for live gameplay."""
    await websocket.accept()

    if game_id not in _SESSIONS:
        _SESSIONS[game_id] = {
            "board": chess.Board(),
            "white_id": None,
            "black_id": None,
            "white_ws": None,
            "black_ws": None,
            "white_time_ms": 600_000,
            "black_time_ms": 600_000,
            "status": "waiting",
            "last_move_time": time.time(),
            "chat": [],
        }

    session = _SESSIONS[game_id]

    # Assign color
    if session["white_id"] is None:
        session["white_id"] = player_id
        session["white_ws"] = websocket
        color = "white"
    elif session["black_id"] is None and session["white_id"] != player_id:
        session["black_id"] = player_id
        session["black_ws"] = websocket
        color = "black"
        session["status"] = "active"
        await _send_both(session, {"type": "game_start",
                                   "white": session["white_id"],
                                   "black": session["black_id"]})
    else:
        # Reconnection
        if session["white_id"] == player_id:
            session["white_ws"] = websocket
            color = "white"
        elif session["black_id"] == player_id:
            session["black_ws"] = websocket
            color = "black"
        else:
            await websocket.close(code=4003, reason="Game is full")
            return

    await websocket.send_json({
        "type": "connected",
        "color": color,
        "fen": session["board"].fen(),
        "white_time_ms": session["white_time_ms"],
        "black_time_ms": session["black_time_ms"],
        "status": session["status"],
    })

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            if msg_type == "move":
                await _handle_move(game_id, session, player_id, msg, websocket)
            elif msg_type == "ai_move":
                await _handle_ai_move(game_id, session, msg, websocket)
            elif msg_type == "chat":
                await _handle_chat(game_id, session, player_id, msg)
            elif msg_type == "resign":
                await _handle_resign(game_id, session, player_id)
            elif msg_type == "draw_offer":
                await _handle_draw_offer(game_id, session, player_id, msg)
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "ts": time.time()})
            else:
                await websocket.send_json({"type": "error", "message": f"Unknown type: {msg_type}"})

    except WebSocketDisconnect:
        if color == "white":
            session["white_ws"] = None
        else:
            session["black_ws"] = None
        await _broadcast(game_id, {"type": "player_disconnected", "player_id": player_id})


async def handle_spectator_connection(websocket: WebSocket, game_id: str):
    """Handle a spectator WebSocket connection."""
    await websocket.accept()
    _SPECTATORS.setdefault(game_id, []).append(websocket)

    session = _SESSIONS.get(game_id)
    if session:
        await websocket.send_json({
            "type": "spectator_joined",
            "fen": session["board"].fen(),
            "white_id": session["white_id"],
            "black_id": session["black_id"],
            "status": session["status"],
        })
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        spectators = _SPECTATORS.get(game_id, [])
        if websocket in spectators:
            spectators.remove(websocket)


async def _handle_move(game_id: str, session: dict, player_id: str,
                       msg: dict, websocket: WebSocket):
    board: chess.Board = session["board"]

    if session["status"] != "active":
        await websocket.send_json({"type": "error", "message": "Game not active"})
        return

    is_white_turn = board.turn == chess.WHITE
    if is_white_turn and player_id != session["white_id"]:
        await websocket.send_json({"type": "error", "message": "Not your turn"})
        return
    if not is_white_turn and player_id != session["black_id"]:
        await websocket.send_json({"type": "error", "message": "Not your turn"})
        return

    uci = msg.get("move", "")
    try:
        move = chess.Move.from_uci(uci)
    except ValueError:
        await websocket.send_json({"type": "error", "message": f"Invalid UCI: {uci}"})
        return

    if move not in board.legal_moves:
        await websocket.send_json({"type": "error", "message": "Illegal move"})
        return

    _update_clock(session, board.turn)
    san = board.san(move)
    board.push(move)

    state = _build_state(session, move, san)
    await _send_both(session, state)
    await _broadcast(game_id, state)

    if board.is_game_over():
        await _end_game(game_id, session, board)


async def _handle_ai_move(game_id: str, session: dict, msg: dict, websocket: WebSocket):
    """Request AI move for current position (used when playing vs AI)."""
    board: chess.Board = session["board"]
    strength = msg.get("strength", "grandmaster")
    time_ms = float(msg.get("time_ms", 5000))

    _ORCHESTRATOR.set_strength(strength)

    loop = asyncio.get_event_loop()
    try:
        decision = await loop.run_in_executor(
            None, lambda: _ORCHESTRATOR.get_best_move(board, time_ms)
        )
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
        return

    if decision.move not in board.legal_moves:
        await websocket.send_json({"type": "error", "message": "AI produced illegal move"})
        return

    _update_clock(session, board.turn)
    san = board.san(decision.move)
    board.push(decision.move)

    state = _build_state(session, decision.move, san)
    state["ai_info"] = {
        "source": decision.source,
        "score": decision.score_str(),
        "depth": decision.depth,
        "nodes": decision.nodes,
        "annotation": decision.annotation,
    }
    await _send_both(session, state)
    await _broadcast(game_id, state)

    if board.is_game_over():
        await _end_game(game_id, session, board)


async def _handle_chat(game_id: str, session: dict, player_id: str, msg: dict):
    text = str(msg.get("text", ""))[:500]
    chat_msg = {"type": "chat", "player_id": player_id,
                "text": text, "ts": time.time()}
    session["chat"].append(chat_msg)
    await _send_both(session, chat_msg)
    await _broadcast(game_id, chat_msg)


async def _handle_resign(game_id: str, session: dict, player_id: str):
    session["status"] = "finished"
    winner = session["black_id"] if player_id == session["white_id"] else session["white_id"]
    result_msg = {
        "type": "game_over",
        "reason": "resignation",
        "winner": winner,
        "result": "0-1" if player_id == session["white_id"] else "1-0",
    }
    await _send_both(session, result_msg)
    await _broadcast(game_id, result_msg)


async def _handle_draw_offer(game_id: str, session: dict, player_id: str, msg: dict):
    if msg.get("accept"):
        session["status"] = "finished"
        result_msg = {"type": "game_over", "reason": "draw_agreement", "result": "1/2-1/2"}
        await _send_both(session, result_msg)
        await _broadcast(game_id, result_msg)
    else:
        opponent_ws = (session["black_ws"] if player_id == session["white_id"]
                       else session["white_ws"])
        if opponent_ws:
            await opponent_ws.send_json({
                "type": "draw_offer", "from": player_id
            })


async def _end_game(game_id: str, session: dict, board: chess.Board):
    session["status"] = "finished"
    outcome = board.outcome()
    result_msg = {
        "type": "game_over",
        "reason": str(outcome.termination.name) if outcome else "unknown",
        "result": outcome.result() if outcome else "*",
        "winner": (session["white_id"] if outcome and outcome.winner == chess.WHITE
                   else session["black_id"] if outcome and outcome.winner == chess.BLACK
                   else None),
    }
    await _send_both(session, result_msg)
    await _broadcast(game_id, result_msg)


def _update_clock(session: dict, turn: bool):
    now = time.time()
    elapsed_ms = int((now - session.get("last_move_time", now)) * 1000)
    if turn == chess.WHITE:
        session["white_time_ms"] = max(0, session["white_time_ms"] - elapsed_ms)
    else:
        session["black_time_ms"] = max(0, session["black_time_ms"] - elapsed_ms)
    session["last_move_time"] = now


def _build_state(session: dict, move: chess.Move, san: str) -> dict:
    board: chess.Board = session["board"]
    return {
        "type": "move",
        "uci": move.uci(),
        "san": san,
        "fen": board.fen(),
        "turn": "white" if board.turn == chess.WHITE else "black",
        "white_time_ms": session["white_time_ms"],
        "black_time_ms": session["black_time_ms"],
        "is_check": board.is_check(),
        "is_game_over": board.is_game_over(),
        "legal_moves": [m.uci() for m in board.legal_moves],
    }


async def _send_both(session: dict, message: dict):
    for ws_key in ["white_ws", "black_ws"]:
        ws = session.get(ws_key)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass
