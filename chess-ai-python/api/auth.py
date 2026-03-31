"""
JWT authentication — register, login, token refresh, current user.
Uses passlib for password hashing and python-jose for JWT tokens.
"""
from __future__ import annotations
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from db.repositories import PlayerRepo

router = APIRouter(prefix="/api/auth", tags=["Auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "chess-ai-pro-secret-change-in-production-32chars")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    display_name: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=6, max_length=128)
    initial_rating: float = Field(default=1500.0, ge=100.0, le=2800.0)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    player_id: str
    username: str
    display_name: str
    rating: float


class UserProfile(BaseModel):
    player_id: str
    username: str
    display_name: str
    rating: float
    rapid_rating: float
    blitz_rating: float
    title: str
    games_played: int
    wins: int
    draws: int
    losses: int
    puzzle_rating: int
    puzzles_solved: int


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_player(token: str = Depends(oauth2_scheme),
                              db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        player_id: str = payload.get("sub")
        if not player_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    repo = PlayerRepo(db)
    player = await repo.get_by_id(player_id)
    if not player:
        raise credentials_exception
    return player


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    repo = PlayerRepo(db)
    existing = await repo.get_by_username(req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    hashed = hash_password(req.password)
    player = await repo.create(req.username, req.display_name, hashed, req.initial_rating)
    token = create_access_token({"sub": player.id})
    return TokenResponse(
        access_token=token,
        player_id=player.id,
        username=player.username,
        display_name=player.display_name,
        rating=player.rating,
    )


@router.post("/token", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(),
                db: AsyncSession = Depends(get_db)):
    repo = PlayerRepo(db)
    player = await repo.get_by_username(form.username)
    if not player or not verify_password(form.password, player.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": player.id})
    return TokenResponse(
        access_token=token,
        player_id=player.id,
        username=player.username,
        display_name=player.display_name,
        rating=player.rating,
    )


@router.get("/me", response_model=UserProfile)
async def me(player=Depends(get_current_player)):
    return UserProfile(
        player_id=player.id,
        username=player.username,
        display_name=player.display_name,
        rating=player.rating,
        rapid_rating=player.rapid_rating,
        blitz_rating=player.blitz_rating,
        title=player.title,
        games_played=player.games_played,
        wins=player.wins,
        draws=player.draws,
        losses=player.losses,
        puzzle_rating=player.puzzle_rating,
        puzzles_solved=player.puzzles_solved,
    )


@router.get("/leaderboard")
async def leaderboard(time_category: str = "classical", limit: int = 50,
                       db: AsyncSession = Depends(get_db)):
    repo = PlayerRepo(db)
    players = await repo.get_leaderboard(limit, time_category)
    return [
        {
            "rank": i + 1,
            "player_id": p.id,
            "username": p.username,
            "display_name": p.display_name,
            "rating": round(p.rating),
            "title": p.title,
            "games_played": p.games_played,
        }
        for i, p in enumerate(players)
    ]
