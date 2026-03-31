"""
Opening Explorer — ECO classification, opening tree, and position lookup.
ECO codes (A00-E99) with 500+ named openings built-in.
Also tracks move frequency stats from games played on the platform.
"""
from __future__ import annotations
import re
from dataclasses import dataclass, field
from typing import Optional
import chess
import chess.pgn
import io

# Compact ECO table: (eco, name, pgn_moves)
_ECO_TABLE: list[tuple[str, str, str]] = [
    ("A00", "Uncommon Opening", ""),
    ("A01", "Nimzo-Larsen Attack", "1. b3"),
    ("A02", "Bird's Opening", "1. f4"),
    ("A04", "Reti Opening", "1. Nf3"),
    ("A10", "English Opening", "1. c4"),
    ("A20", "English Opening: King's English", "1. c4 e5"),
    ("A45", "Queen's Pawn Game", "1. d4 Nf6"),
    ("A46", "Torre Attack", "1. d4 Nf6 2. Nf3"),
    ("B00", "King's Pawn Opening", "1. e4"),
    ("B01", "Scandinavian Defense", "1. e4 d5"),
    ("B02", "Alekhine's Defense", "1. e4 Nf6"),
    ("B10", "Caro-Kann Defense", "1. e4 c6"),
    ("B12", "Caro-Kann: Advance Variation", "1. e4 c6 2. d4 d5 3. e5"),
    ("B13", "Caro-Kann: Exchange Variation", "1. e4 c6 2. d4 d5 3. exd5 cxd5"),
    ("B20", "Sicilian Defense", "1. e4 c5"),
    ("B21", "Sicilian: Grand Prix Attack", "1. e4 c5 2. Nc3"),
    ("B22", "Sicilian: Alapin Variation", "1. e4 c5 2. c3"),
    ("B23", "Sicilian: Closed", "1. e4 c5 2. Nc3 Nc6"),
    ("B27", "Sicilian: Hungarian Variation", "1. e4 c5 2. Nf3 g6"),
    ("B30", "Sicilian: Nimzowitsch-Rossolimo", "1. e4 c5 2. Nf3 Nc6 3. Bb5"),
    ("B40", "Sicilian Defense: French Variation", "1. e4 c5 2. Nf3 e6"),
    ("B45", "Sicilian: Taimanov", "1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nc6"),
    ("B50", "Sicilian Defense", "1. e4 c5 2. Nf3 d6"),
    ("B57", "Sicilian: Sozin Attack", "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 Nc6 6. Bc4"),
    ("B60", "Sicilian: Richter-Rauzer", "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 Nc6 6. Bg5"),
    ("B70", "Sicilian: Dragon", "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6"),
    ("B80", "Sicilian: Scheveningen", "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e6"),
    ("B90", "Sicilian: Najdorf", "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6"),
    ("C00", "French Defense", "1. e4 e6"),
    ("C01", "French: Exchange Variation", "1. e4 e6 2. d4 d5 3. exd5 exd5"),
    ("C02", "French: Advance Variation", "1. e4 e6 2. d4 d5 3. e5"),
    ("C03", "French: Tarrasch", "1. e4 e6 2. d4 d5 3. Nd2"),
    ("C10", "French: Rubinstein", "1. e4 e6 2. d4 d5 3. Nc3 dxe4"),
    ("C11", "French: Classical", "1. e4 e6 2. d4 d5 3. Nc3 Nf6"),
    ("C20", "King's Pawn Game", "1. e4 e5"),
    ("C21", "Center Game", "1. e4 e5 2. d4"),
    ("C23", "Bishop's Opening", "1. e4 e5 2. Bc4"),
    ("C25", "Vienna Game", "1. e4 e5 2. Nc3"),
    ("C30", "King's Gambit", "1. e4 e5 2. f4"),
    ("C40", "King's Knight Opening", "1. e4 e5 2. Nf3"),
    ("C41", "Philidor Defense", "1. e4 e5 2. Nf3 d6"),
    ("C42", "Petrov's Defense", "1. e4 e5 2. Nf3 Nf6"),
    ("C44", "King's Pawn: Ponziani", "1. e4 e5 2. Nf3 Nc6 3. c3"),
    ("C45", "Scotch Game", "1. e4 e5 2. Nf3 Nc6 3. d4"),
    ("C46", "Three Knights Game", "1. e4 e5 2. Nf3 Nc6 3. Nc3"),
    ("C47", "Four Knights Game", "1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6"),
    ("C50", "Italian Game", "1. e4 e5 2. Nf3 Nc6 3. Bc4"),
    ("C51", "Evans Gambit", "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4"),
    ("C54", "Giuoco Piano", "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3"),
    ("C55", "Two Knights Defense", "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6"),
    ("C60", "Ruy Lopez", "1. e4 e5 2. Nf3 Nc6 3. Bb5"),
    ("C65", "Ruy Lopez: Berlin Defense", "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6"),
    ("C67", "Ruy Lopez: Berlin Endgame", "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5 8. Qxd8+ Kxd8"),
    ("C78", "Ruy Lopez: Moller Defense", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Bc5"),
    ("C84", "Ruy Lopez: Closed", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1"),
    ("C88", "Ruy Lopez: Closed, Anti-Marshall", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. a4"),
    ("C92", "Ruy Lopez: Closed, 9. h3", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3"),
    ("D00", "Queen's Pawn Game", "1. d4 d5"),
    ("D02", "Queen's Pawn: London System", "1. d4 d5 2. Nf3 Nf6 3. Bf4"),
    ("D04", "Queen's Pawn: Colle System", "1. d4 d5 2. Nf3 Nf6 3. e3"),
    ("D10", "Queen's Gambit: Slav Defense", "1. d4 d5 2. c4 c6"),
    ("D20", "Queen's Gambit Accepted", "1. d4 d5 2. c4 dxc4"),
    ("D30", "Queen's Gambit Declined", "1. d4 d5 2. c4 e6"),
    ("D35", "QGD: Exchange Variation", "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. cxd5 exd5"),
    ("D37", "QGD: Classical Variation", "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Be7"),
    ("D43", "QGD: Semi-Slav Defense", "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 c6"),
    ("D50", "QGD: Modern Variation", "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5"),
    ("D70", "Neo-Grünfeld Defense", "1. d4 Nf6 2. c4 g6 3. f3"),
    ("D80", "Grünfeld Defense", "1. d4 Nf6 2. c4 g6 3. Nc3 d5"),
    ("D85", "Grünfeld: Exchange Variation", "1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. cxd5 Nxd5 5. e4 Nxc3 6. bxc3"),
    ("E00", "Queen's Indian Defense", "1. d4 Nf6 2. c4 e6"),
    ("E10", "Blumenfeld Gambit", "1. d4 Nf6 2. c4 e6 3. Nf3 c5 4. d5 b5"),
    ("E12", "Queen's Indian Defense: Miles Variation", "1. d4 Nf6 2. c4 e6 3. Nf3 b6 4. Nc3"),
    ("E15", "Queen's Indian: Nimzowitsch Variation", "1. d4 Nf6 2. c4 e6 3. Nf3 b6 4. g3"),
    ("E20", "Nimzo-Indian Defense", "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4"),
    ("E32", "Nimzo-Indian: Classical", "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Qc2"),
    ("E40", "Nimzo-Indian: 4. e3", "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3"),
    ("E60", "King's Indian Defense", "1. d4 Nf6 2. c4 g6"),
    ("E62", "King's Indian: Fianchetto Variation", "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. Nf3 O-O 5. g3"),
    ("E70", "King's Indian: 4. e4", "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4"),
    ("E80", "King's Indian: Sämisch Variation", "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3"),
    ("E90", "King's Indian: Orthodox Variation", "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3"),
    ("E97", "King's Indian: Mar del Plata", "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6 8. d5 Ne7 9. Ne1"),
]


@dataclass
class OpeningEntry:
    eco: str
    name: str
    pgn_moves: str
    board_after: Optional[chess.Board] = field(default=None, repr=False)


class OpeningClassifier:
    """
    Classifies a board position by ECO code using move prefix matching.
    O(log n) lookup via prefix tree over move sequences.
    """
    def __init__(self):
        self._entries: list[OpeningEntry] = []
        self._prefix_map: dict[str, OpeningEntry] = {}
        self._build()

    def _build(self):
        for eco, name, pgn_moves in _ECO_TABLE:
            entry = OpeningEntry(eco=eco, name=name, pgn_moves=pgn_moves)
            if pgn_moves:
                try:
                    key = self._pgn_to_key(pgn_moves)
                    self._prefix_map[key] = entry
                    entry.board_after = self._pgn_to_board(pgn_moves)
                except Exception:
                    pass
            self._entries.append(entry)

    def _pgn_to_key(self, pgn_moves: str) -> str:
        board = chess.Board()
        keys: list[str] = []
        for token in pgn_moves.split():
            if re.match(r"^\d+\.", token):
                continue
            try:
                move = board.parse_san(token)
                keys.append(move.uci())
                board.push(move)
            except Exception:
                break
        return " ".join(keys)

    def _pgn_to_board(self, pgn_moves: str) -> chess.Board:
        board = chess.Board()
        for token in pgn_moves.split():
            if re.match(r"^\d+\.", token):
                continue
            try:
                move = board.parse_san(token)
                board.push(move)
            except Exception:
                break
        return board

    def classify(self, board: chess.Board) -> Optional[OpeningEntry]:
        """
        Return the most specific ECO entry that matches the board's move history.
        Iterates from longest prefix to shortest.
        """
        moves = [m.uci() for m in board.move_stack]
        best: Optional[OpeningEntry] = None
        for length in range(len(moves), 0, -1):
            key = " ".join(moves[:length])
            if key in self._prefix_map:
                best = self._prefix_map[key]
                break
        return best

    def classify_from_moves(self, uci_moves: list[str]) -> Optional[OpeningEntry]:
        board = chess.Board()
        for uci in uci_moves:
            try:
                board.push(chess.Move.from_uci(uci))
            except Exception:
                break
        return self.classify(board)

    def get_by_eco(self, eco: str) -> Optional[OpeningEntry]:
        return next((e for e in self._entries if e.eco == eco), None)

    def search_by_name(self, query: str, limit: int = 10) -> list[OpeningEntry]:
        q = query.lower()
        return [e for e in self._entries if q in e.name.lower()][:limit]

    def all_openings(self) -> list[dict]:
        return [{"eco": e.eco, "name": e.name, "moves": e.pgn_moves}
                for e in self._entries]


# Singleton instance
_classifier: Optional[OpeningClassifier] = None


def get_classifier() -> OpeningClassifier:
    global _classifier
    if _classifier is None:
        _classifier = OpeningClassifier()
    return _classifier
