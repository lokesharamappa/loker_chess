"""
API integration tests — auth, openings, and tournament routes.
Uses FastAPI TestClient (synchronous, no running server needed).
"""
import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
AFTER_E4  = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"


# ── Auth Routes ──────────────────────────────────────────────────────────────

class TestAuthRoutes:
    def test_register_creates_user(self):
        r = client.post("/api/auth/register", json={
            "username": "tdd_user_1",
            "display_name": "TDD User One",
            "password": "securepass",
        })
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["username"] == "tdd_user_1"
        assert data["rating"] == 1500.0

    def test_duplicate_username_rejected(self):
        payload = {"username": "tdd_dup", "display_name": "Dup", "password": "pass123"}
        client.post("/api/auth/register", json=payload)
        r2 = client.post("/api/auth/register", json=payload)
        assert r2.status_code == 400
        assert "taken" in r2.json()["detail"].lower()

    def test_login_returns_token(self):
        client.post("/api/auth/register", json={
            "username": "tdd_login", "display_name": "Login", "password": "mypassword"
        })
        r = client.post("/api/auth/token", data={
            "username": "tdd_login", "password": "mypassword"
        })
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_wrong_password_rejected(self):
        client.post("/api/auth/register", json={
            "username": "tdd_badpass", "display_name": "Bad", "password": "correct"
        })
        r = client.post("/api/auth/token", data={
            "username": "tdd_badpass", "password": "wrong"
        })
        assert r.status_code == 401

    def test_me_endpoint_requires_auth(self):
        r = client.get("/api/auth/me")
        assert r.status_code == 401

    def test_me_endpoint_with_valid_token(self):
        reg = client.post("/api/auth/register", json={
            "username": "tdd_me", "display_name": "Me User", "password": "mepass123"
        })
        token = reg.json()["access_token"]
        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["username"] == "tdd_me"

    def test_register_validates_short_password(self):
        r = client.post("/api/auth/register", json={
            "username": "tdd_short", "display_name": "Short", "password": "abc"
        })
        assert r.status_code == 422

    def test_register_validates_short_username(self):
        r = client.post("/api/auth/register", json={
            "username": "ab", "display_name": "Short", "password": "validpass"
        })
        assert r.status_code == 422


# ── Opening Routes ───────────────────────────────────────────────────────────

class TestOpeningRoutes:
    def test_classify_start_position(self):
        r = client.get(f"/api/openings/classify", params={"fen": START_FEN})
        assert r.status_code == 200
        data = r.json()
        assert "eco" in data
        assert "name" in data

    def test_classify_after_e4(self):
        r = client.get("/api/openings/classify", params={"fen": AFTER_E4})
        assert r.status_code == 200

    def test_classify_invalid_fen_rejected(self):
        r = client.get("/api/openings/classify", params={"fen": "not_a_valid_fen"})
        assert r.status_code == 400

    def test_search_returns_results(self):
        r = client.get("/api/openings/search", params={"q": "Sicilian"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert any("Sicilian" in item.get("name", "") for item in data)

    def test_search_empty_query_returns_all_or_400(self):
        r = client.get("/api/openings/search", params={"q": ""})
        assert r.status_code in (200, 400)

    def test_all_openings_returns_list(self):
        r = client.get("/api/openings/all")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 60

    def test_all_openings_have_eco_and_name(self):
        r = client.get("/api/openings/all")
        for item in r.json()[:5]:
            assert "eco" in item
            assert "name" in item


# ── Tournament Routes ────────────────────────────────────────────────────────

class TestTournamentRoutes:
    @pytest.fixture
    def tournament_id(self):
        r = client.post("/api/tournaments/create", json={
            "name": "Test Swiss Open",
            "format": "swiss",
            "time_control": "rapid",
            "rounds": 3,
            "max_players": 8,
            "rated": False,
        })
        assert r.status_code == 200
        return r.json()["tournament_id"]

    def test_create_tournament(self):
        r = client.post("/api/tournaments/create", json={
            "name": "TDD Tournament",
            "format": "swiss",
            "time_control": "blitz",
            "rounds": 5,
            "max_players": 16,
            "rated": True,
        })
        assert r.status_code == 200
        data = r.json()
        assert "tournament_id" in data
        assert data["name"] == "TDD Tournament"

    def test_create_round_robin(self):
        r = client.post("/api/tournaments/create", json={
            "name": "RR Test", "format": "round_robin",
            "time_control": "classical", "rounds": 4, "max_players": 4, "rated": False,
        })
        assert r.status_code == 200

    def test_get_nonexistent_tournament_returns_404(self):
        r = client.get("/api/tournaments/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404

    def test_register_player(self, tournament_id):
        r = client.post(f"/api/tournaments/{tournament_id}/register", json={
            "player_id": "player-001",
            "name": "Alice",
            "rating": 1800.0,
        })
        assert r.status_code == 200
        assert r.json()["status"] == "registered"

    def test_get_tournament_status(self, tournament_id):
        r = client.get(f"/api/tournaments/{tournament_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["tournament_id"] == tournament_id
        assert "standings" in data
        assert "current_round" in data

    def test_start_round_with_players(self, tournament_id):
        for i in range(4):
            client.post(f"/api/tournaments/{tournament_id}/register", json={
                "player_id": f"p-{i}", "name": f"Player {i}", "rating": 1500.0 + i * 50
            })
        r = client.post(f"/api/tournaments/{tournament_id}/start-round")
        assert r.status_code == 200
        data = r.json()
        assert "pairings" in data
        assert len(data["pairings"]) == 2

    def test_record_result(self, tournament_id):
        for i in range(2):
            client.post(f"/api/tournaments/{tournament_id}/register", json={
                "player_id": f"rr-p{i}", "name": f"Rplayer {i}", "rating": 1500.0
            })
        client.post(f"/api/tournaments/{tournament_id}/start-round")
        r = client.post(
            f"/api/tournaments/{tournament_id}/result",
            params={"round_number": 1},
            json={"white_id": "rr-p0", "black_id": "rr-p1", "result": "1-0"},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "recorded"

    def test_crosstable_returns_dict(self, tournament_id):
        r = client.get(f"/api/tournaments/{tournament_id}/crosstable")
        assert r.status_code == 200
        assert "crosstable" in r.json()

    def test_register_to_full_tournament(self):
        r = client.post("/api/tournaments/create", json={
            "name": "Tiny", "format": "swiss", "time_control": "blitz",
            "rounds": 1, "max_players": 2, "rated": False,
        })
        tid = r.json()["tournament_id"]
        for i in range(2):
            client.post(f"/api/tournaments/{tid}/register", json={
                "player_id": f"full-p{i}", "name": f"Full {i}", "rating": 1500.0
            })
        r3 = client.post(f"/api/tournaments/{tid}/register", json={
            "player_id": "overflow", "name": "Extra", "rating": 1500.0
        })
        assert r3.status_code == 400


# ── Health + Strengths ───────────────────────────────────────────────────────

class TestHealthRoutes:
    def test_health_endpoint(self):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_strengths_returns_all_levels(self):
        r = client.get("/api/strengths")
        assert r.status_code == 200
        data = r.json()
        expected = {"beginner", "novice", "intermediate", "advanced",
                    "expert", "master", "grandmaster", "super_gm"}
        assert set(data.keys()) == expected
