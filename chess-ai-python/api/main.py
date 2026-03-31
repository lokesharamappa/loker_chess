"""
Main FastAPI application — mounts all routes and WebSocket endpoints.
FIDE-level professional chess API.
"""
from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os

from api.routes.game import router as game_router
from api.routes.tournament import router as tournament_router
from api.routes.puzzles import router as puzzles_router
from api.routes.openings import router as openings_router
from api.routes.history import router as history_router
from api.auth import router as auth_router
from api.websocket.handlers import (
    handle_player_connection,
    handle_spectator_connection,
)
from db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Chess AI Pro — FIDE Level Backend Starting...")
    await init_db()
    print("Database initialized.")
    yield
    print("Chess AI Pro — Shutting down gracefully.")


app = FastAPI(
    title="Chess AI Pro — FIDE Level",
    description=(
        "Professional chess web application with multi-agent AI, "
        "FIDE rating system, Swiss tournaments, puzzles, opening explorer, "
        "game annotation, and real-time WebSocket gameplay."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(game_router)
app.include_router(tournament_router)
app.include_router(puzzles_router)
app.include_router(openings_router)
app.include_router(history_router)


@app.websocket("/ws/game/{game_id}/{player_id}")
async def game_ws(websocket: WebSocket, game_id: str, player_id: str):
    await handle_player_connection(websocket, game_id, player_id)


@app.websocket("/ws/spectate/{game_id}")
async def spectate_ws(websocket: WebSocket, game_id: str):
    await handle_spectator_connection(websocket, game_id)


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "Chess AI Pro",
        "version": "1.0.0",
        "agents": ["OpeningAgent", "SearchAgent", "EndgameAgent"],
        "features": ["FIDE ELO", "Swiss Tournaments", "Real-time WebSocket", "Analysis"],
    }


@app.get("/api/strengths")
async def get_strengths():
    from agents.search_agent import STRENGTH_PROFILES
    return {
        name: {"elo": p["elo"], "depth": p["depth"]}
        for name, p in STRENGTH_PROFILES.items()
    }


if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return HTMLResponse("""
        <html><body>
        <h1>Chess AI Pro — API Running</h1>
        <p>API Docs: <a href="/docs">/docs</a></p>
        <p>Redoc: <a href="/redoc">/redoc</a></p>
        </body></html>
        """)
