---
title: "Player Authentication — JWT Register/Login"
id: "SPEC-2026-03-31-005"
author: "Chess AI Development Team"
status: "Implemented"
created: "2026-03-31"
updated: "2026-03-31"
type: "feature"
---

## Overview

### Problem Statement
Players need persistent accounts to track ratings, game history, and puzzle progress. A stateless JWT-based system eliminates session storage while keeping the API horizontally scalable.

### Goals
- Register with username + display_name + password
- Login via OAuth2 password flow (form-encoded)
- Issue 24h JWT with player_id claim
- Protect puzzle and history endpoints with Bearer token
- Frontend modal (AuthModal) with login/register tabs

### Scope
**In scope:** Register, login, `/me` profile, JWT middleware, frontend modal  
**Out of scope:** OAuth2 social login, email verification, password reset

---

## Requirements

### Functional Requirements
- FR-001: Register MUST hash passwords with `pbkdf2_sha256` (not bcrypt — Python 3.13 incompatible)
- FR-002: Login endpoint MUST accept `application/x-www-form-urlencoded` (OAuth2 spec)
- FR-003: JWT expiry MUST be 24 hours
- FR-004: Duplicate usernames MUST return HTTP 400
- FR-005: Passwords < 6 chars MUST return HTTP 422
- FR-006: `GET /api/auth/me` MUST require valid Bearer token

### Non-Functional Requirements
- NFR-001: Password hash time < 500ms
- NFR-002: JWT verification < 5ms

### Security
- SECRET_KEY loaded from env var `SECRET_KEY` (32+ chars)
- Passwords never logged or returned in responses
- Token contains only `sub` (player_id) and `exp` claims

---

## Design

### API Design
```
POST /api/auth/register   JSON body → TokenResponse + profile
POST /api/auth/token      form-encoded → TokenResponse + profile
GET  /api/auth/me         Bearer → UserProfile
GET  /api/auth/leaderboard?limit=20 → [{player_id, display_name, rating}]
```

### Frontend Auth Flow
```
AuthModal (Login tab) → POST /api/auth/token → useAuth.login() → localStorage → header shows user
AuthModal (Register tab) → POST /api/auth/register → useAuth.register() → localStorage
Header logout button → useAuth.logout() → clearStorage()
```

### Data Model
```
players: id (UUID), username (unique), display_name, hashed_password,
         rating (default 1500), rapid_rating, blitz_rating, puzzle_rating,
         games_played, wins, draws, losses, puzzles_solved, title
```

---

## Acceptance Criteria

### Definition of Done
- [x] Register → login → `/me` full flow works end-to-end
- [x] Duplicate username rejected with HTTP 400
- [x] Wrong password rejected with HTTP 401
- [x] JWT persists across page reloads (localStorage)
- [x] All 8 auth tests in `test_routes.py` pass

### Rollback Plan
- Revert `pwd_context` scheme to `bcrypt` if Python version < 3.13
- Drop `chess_pro.db` and recreate schema on breaking model changes
