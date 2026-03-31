---
title: "Chess Game API"
id: "SPEC-API-2026-03-30-001"
author: "Chess API Team"
status: "Draft"
created: "2026-03-30"
updated: "2026-03-30"
type: "chess-api"
---

## Overview

### Purpose
The Chess Game API provides RESTful endpoints for creating, managing, and playing chess games. It supports single-player games against AI, multiplayer games, and tournament management.

### Scope
This API covers game creation, move submission, game state retrieval, and player management. It does not include user authentication or tournament administration.

### Version
v1.0.0

## Endpoints

### POST /api/v1/games
#### Description
Creates a new chess game with specified parameters.

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| game_type | string | yes | "ai" or "multiplayer" |
| time_control | object | yes | Time control settings |
| player_color | string | no | "white" or "black" (for AI games) |
| ai_difficulty | string | no | "easy", "medium", "hard" (for AI games) |

#### Request Body
```json
{
  "game_type": "ai",
  "time_control": {
    "type": "bullet",
    "minutes": 1,
    "increment": 0
  },
  "player_color": "white",
  "ai_difficulty": "medium"
}
```

#### Response
**201 Created**
```json
{
  "game_id": "game_123456789",
  "status": "active",
  "current_player": "white",
  "board": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "moves": [],
  "time_remaining": {
    "white": 60,
    "black": 60
  },
  "created_at": "2026-03-30T12:00:00Z"
}
```

**400 Bad Request**
```json
{
  "error": "Bad Request",
  "message": "Invalid game_type specified"
}
```

#### Error Codes
| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

#### Examples
```bash
curl -X POST "https://api.chess.com/api/v1/games" \
  -H "Content-Type: application/json" \
  -d '{"game_type": "ai", "time_control": {"type": "bullet", "minutes": 1}}'
```

### POST /api/v1/games/{game_id}/moves
#### Description
Submits a move in an existing chess game.

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| game_id | string | yes | Unique game identifier |

#### Request Body
```json
{
  "move": "e2e4",
  "notation": "e4"
}
```

#### Response
**200 OK**
```json
{
  "move_id": "move_987654321",
  "move": "e2e4",
  "notation": "e4",
  "status": "active",
  "current_player": "black",
  "board": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "moves": [
    {
      "move": "e2e4",
      "notation": "e4",
      "timestamp": "2026-03-30T12:00:05Z",
      "player": "white"
    }
  ],
  "time_remaining": {
    "white": 59,
    "black": 60
  },
  "game_result": null
}
```

**400 Bad Request**
```json
{
  "error": "Bad Request",
  "message": "Illegal move: e2e5"
}
```

**409 Conflict**
```json
{
  "error": "Conflict",
  "message": "Not your turn to move"
}
```

#### Error Codes
| Code | Description |
|------|-------------|
| 400 | Illegal move |
| 404 | Game not found |
| 409 | Not your turn |
| 410 | Game ended |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

#### Examples
```bash
curl -X POST "https://api.chess.com/api/v1/games/game_123456789/moves" \
  -H "Content-Type: application/json" \
  -d '{"move": "e2e4", "notation": "e4"}'
```

### GET /api/v1/games/{game_id}
#### Description
Retrieves the current state of a chess game.

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| game_id | string | yes | Unique game identifier |

#### Response
**200 OK**
```json
{
  "game_id": "game_123456789",
  "status": "active",
  "current_player": "black",
  "board": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "moves": [
    {
      "move": "e2e4",
      "notation": "e4",
      "timestamp": "2026-03-30T12:00:05Z",
      "player": "white"
    }
  ],
  "time_remaining": {
    "white": 59,
    "black": 60
  },
  "game_result": null,
  "created_at": "2026-03-30T12:00:00Z",
  "updated_at": "2026-03-30T12:00:05Z"
}
```

**404 Not Found**
```json
{
  "error": "Not Found",
  "message": "Game not found"
}
```

#### Error Codes
| Code | Description |
|------|-------------|
| 404 | Game not found |
| 500 | Internal Server Error |

#### Examples
```bash
curl -X GET "https://api.chess.com/api/v1/games/game_123456789"
```

### GET /api/v1/games/{game_id}/legal-moves
#### Description
Retrieves all legal moves for the current player in a game.

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| game_id | string | yes | Unique game identifier |

#### Response
**200 OK**
```json
{
  "game_id": "game_123456789",
  "current_player": "black",
  "legal_moves": [
    {
      "from": "e7",
      "to": "e5",
      "notation": "e5",
      "move_type": "normal"
    },
    {
      "from": "g8",
      "to": "f6",
      "notation": "Nf6",
      "move_type": "normal"
    },
    {
      "from": "e8",
      "to": "g8",
      "notation": "O-O",
      "move_type": "castling"
    }
  ],
  "move_count": 20
}
```

**404 Not Found**
```json
{
  "error": "Not Found",
  "message": "Game not found"
}
```

#### Error Codes
| Code | Description |
|------|-------------|
| 404 | Game not found |
| 410 | Game ended |
| 500 | Internal Server Error |

#### Examples
```bash
curl -X GET "https://api.chess.com/api/v1/games/game_123456789/legal-moves"
```

### POST /api/v1/games/{game_id}/resign
#### Description
Resigns from the current game.

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| game_id | string | yes | Unique game identifier |

#### Request Body
```json
{
  "player": "white"
}
```

#### Response
**200 OK**
```json
{
  "game_id": "game_123456789",
  "status": "ended",
  "game_result": {
    "winner": "black",
    "result": "resignation",
    "resigned_player": "white"
  },
  "final_board": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "move_count": 1,
  "ended_at": "2026-03-30T12:05:00Z"
}
```

**404 Not Found**
```json
{
  "error": "Not Found",
  "message": "Game not found"
}
```

**409 Conflict**
```json
{
  "error": "Conflict",
  "message": "Game already ended"
}
```

#### Error Codes
| Code | Description |
|------|-------------|
| 404 | Game not found |
| 409 | Game already ended |
| 500 | Internal Server Error |

#### Examples
```bash
curl -X POST "https://api.chess.com/api/v1/games/game_123456789/resign" \
  -H "Content-Type: application/json" \
  -d '{"player": "white"}'
```

## Data Models

### Game Model
#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| game_id | string | yes | Unique game identifier |
| game_type | string | yes | "ai" or "multiplayer" |
| status | string | yes | "active", "ended", "aborted" |
| current_player | string | yes | "white" or "black" |
| board | string | yes | FEN notation of board state |
| moves | array | yes | Array of move objects |
| time_control | object | yes | Time control settings |
| time_remaining | object | yes | Time remaining for each player |
| game_result | object | no | Game result if ended |
| created_at | string | yes | ISO 8601 timestamp |
| updated_at | string | yes | ISO 8601 timestamp |

#### Validation Rules
- `game_id`: Must be a valid UUID
- `game_type`: Must be "ai" or "multiplayer"
- `board`: Must be valid FEN notation
- `moves`: Must be in chronological order
- `time_remaining`: Must be non-negative integers

#### Examples
```json
{
  "game_id": "game_123456789",
  "game_type": "ai",
  "status": "active",
  "current_player": "black",
  "board": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "moves": [
    {
      "move": "e2e4",
      "notation": "e4",
      "timestamp": "2026-03-30T12:00:05Z",
      "player": "white"
    }
  ],
  "time_control": {
    "type": "bullet",
    "minutes": 1,
    "increment": 0
  },
  "time_remaining": {
    "white": 59,
    "black": 60
  },
  "game_result": null,
  "created_at": "2026-03-30T12:00:00Z",
  "updated_at": "2026-03-30T12:00:05Z"
}
```

### Move Model
#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| move | string | yes | Move in algebraic notation (e2e4) |
| notation | string | yes | Move in standard notation (e4) |
| timestamp | string | yes | ISO 8601 timestamp |
| player | string | yes | "white" or "black" |
| move_type | string | no | "normal", "castling", "en_passant", "promotion" |

#### Validation Rules
- `move`: Must be valid UCI notation
- `notation`: Must be valid SAN notation
- `player`: Must match current player when move was made
- `timestamp`: Must be within game time constraints

#### Examples
```json
{
  "move": "e2e4",
  "notation": "e4",
  "timestamp": "2026-03-30T12:00:05Z",
  "player": "white",
  "move_type": "normal"
}
```

## Security

### Authentication
- JWT-based authentication required for all endpoints
- Token must include user_id and permissions
- Tokens expire after 24 hours

### Authorization
- Players can only access their own games
- Spectators can view games but not make moves
- Admin users can access all games

### Rate Limiting
- 100 requests per minute per user
- 10 requests per second per game
- Burst allowance of 20 requests

### Data Validation
- All moves validated against chess rules
- FEN notation validated for correctness
- Time controls validated for reasonable ranges
- Input sanitized to prevent injection attacks

## Testing

### Unit Tests
- Move validation logic
- FEN notation parsing
- Time control calculations
- Game state transitions

### Integration Tests
- Complete game flows
- API endpoint integration
- Database interactions
- Error handling scenarios

### Performance Tests
- Concurrent game handling
- Move submission latency
- Database query performance
- Memory usage under load

### Chess-Specific Tests
- All chess rule implementations
- Special moves (castling, en passant, promotion)
- Game ending conditions
- Position validation
