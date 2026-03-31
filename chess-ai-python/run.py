"""
Entry point — starts the Chess AI Pro FIDE-level backend.
Usage:
    python run.py                  # default: port 8000
    python run.py --port 8080
    python run.py --reload         # dev mode with hot reload
    python run.py --demo           # run a quick AI self-play demo
"""
import argparse
import sys


def start_server(port: int = 8000, reload: bool = False, workers: int = 1):
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
        workers=workers if not reload else 1,
        log_level="info",
    )


def run_demo():
    """Quick demo: AI vs AI self-play for 20 moves, printing the game."""
    import chess
    from agents.orchestrator import ChessAIOrchestrator, OrchestratorConfig

    print("\n=== Chess AI Pro — Self-Play Demo ===\n")

    white_ai = ChessAIOrchestrator(OrchestratorConfig(
        strength="master", tt_size_mb=32, time_limit_ms=1000
    ))
    black_ai = ChessAIOrchestrator(OrchestratorConfig(
        strength="grandmaster", tt_size_mb=32, time_limit_ms=1000
    ))

    board = chess.Board()
    move_count = 0

    while not board.is_game_over() and move_count < 40:
        ai = white_ai if board.turn == chess.WHITE else black_ai
        color_name = "White (Master)" if board.turn == chess.WHITE else "Black (GM)"

        try:
            decision = ai.get_best_move(board)
        except Exception as e:
            print(f"Error: {e}")
            break

        san = board.san(decision.move)
        board.push(decision.move)
        move_count += 1

        move_num = (move_count + 1) // 2
        if board.turn == chess.BLACK:
            print(f"{move_num:>3}. {san:<8}", end="  ")
        else:
            print(f"{san:<8}  [{decision.score_str():>7}] depth={decision.depth} src={decision.source}")

    print(f"\n\nFinal position FEN:\n{board.fen()}")
    if board.is_game_over():
        outcome = board.outcome()
        print(f"Result: {outcome.result()} — {outcome.termination.name}")
    else:
        print("Game truncated at 40 moves.")

    white_ai.close()
    black_ai.close()


def run_rating_demo():
    """Demo FIDE rating calculations."""
    from fide.rating import FIDERatingCalculator, PlayerRating, FIDETitle

    print("\n=== FIDE Rating System Demo ===\n")

    players = [
        PlayerRating("magnus",  "Magnus Carlsen",   2852, 200, FIDETitle.GM),
        PlayerRating("hikaru",  "Hikaru Nakamura",  2794, 150, FIDETitle.GM),
        PlayerRating("fabiano", "Fabiano Caruana",  2804, 180, FIDETitle.GM),
        PlayerRating("pragg",   "Praggnanandhaa",   2747, 80,  FIDETitle.GM),
    ]

    # Simulate a tournament result for Magnus: 3/4 (win, draw, win, loss)
    opponent_ratings = [p.rating for p in players[1:]]
    scores = [1.0, 0.5, 1.0, 0.0]

    result = FIDERatingCalculator.update_rating(players[0], opponent_ratings, scores)
    print(f"Player:           {players[0].player_id}")
    print(f"Old Rating:       {round(result.old_rating)}")
    print(f"New Rating:       {round(result.new_rating)}")
    print(f"Rating Change:    {result.delta:+.1f}")
    print(f"Performance:      {round(result.performance_rating)}")
    print(f"Score:            {sum(scores)}/{len(scores)}")


def run_tournament_demo():
    """Demo Swiss tournament pairing."""
    from fide.tournament import SwissTournament, TournamentConfig, TournamentFormat, GameResult

    print("\n=== Swiss Tournament Demo ===\n")

    config = TournamentConfig(name="Demo Tournament", rounds=3)
    t = SwissTournament(config)

    players = [
        ("p1", "Magnus C.",  2852),
        ("p2", "Hikaru N.",  2794),
        ("p3", "Fabiano C.", 2804),
        ("p4", "Alireza F.", 2760),
        ("p5", "Pragg",      2747),
        ("p6", "Gukesh",     2724),
    ]
    for pid, name, rating in players:
        t.register_player(pid, name, rating)

    for rnd in range(1, 4):
        pairings = t.start_round()
        print(f"Round {rnd} Pairings:")
        for p in pairings:
            print(f"  {p.white_id:4} (W) vs {p.black_id:4} (B)")
            # Simulate result: white wins first 2, rest draws
            result = GameResult.WHITE_WIN if rnd == 1 else GameResult.DRAW
            if p.black_id != "BYE":
                t.record_result(rnd, p.white_id, p.black_id, result)
        print()

    print("Final Standings:")
    print(t.export_crosstable())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chess AI Pro — FIDE Level")
    parser.add_argument("--port",    type=int, default=8000)
    parser.add_argument("--reload",  action="store_true")
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--demo",    action="store_true", help="Run AI self-play demo")
    parser.add_argument("--rating-demo",    dest="rating_demo",    action="store_true")
    parser.add_argument("--tournament-demo", dest="tournament_demo", action="store_true")
    args = parser.parse_args()

    if args.demo:
        run_demo()
    elif args.rating_demo:
        run_rating_demo()
    elif args.tournament_demo:
        run_tournament_demo()
    else:
        print(f"Starting Chess AI Pro on http://0.0.0.0:{args.port}")
        print("API docs: http://localhost:{}/docs".format(args.port))
        start_server(args.port, args.reload, args.workers)
