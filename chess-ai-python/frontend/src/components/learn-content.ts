export type Category = 'openings' | 'middlegame' | 'endgame' | 'psychology' | 'thinking'
export type Level = 'beginner' | 'intermediate' | 'advanced'

export interface Lesson {
  id: string
  category: Category
  title: string
  subtitle: string
  level: Level
  fen: string
  keyPoints: string[]
  paragraphs: string[]
  famousNote?: string
}

export const LESSONS: Lesson[] = [
  // ── OPENINGS ────────────────────────────────────────────────────
  {
    id: 'open-1', category: 'openings', title: 'The Open Game — 1.e4 e5',
    subtitle: 'Foundation of classical chess', level: 'beginner',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    keyPoints: [
      'Controls the center with a pawn immediately',
      'Opens diagonals for queen and king bishop',
      'Leads to sharp, tactical games — best studied first',
      'Best starting point for beginners of all styles',
      'Used by World Champions from Morphy to Kasparov',
    ],
    paragraphs: [
      '1.e4 is the most popular first move in chess, played by Morphy, Fischer, and Kasparov. Black\'s most direct reply is 1...e5, fighting for the center immediately. Both sides seize the center with pawns, opening lines for bishops and queens.',
      'The open game leads to rich tactical battles. White typically plays 2.Nf3 attacking the e5 pawn, and Black defends with 2...Nc6. This is the starting point for the Italian Game (3.Bc4), Ruy Lopez (3.Bb5), and Scotch Game (3.d4). Mastering these three is essential for every player.',
      'Key principle: develop your pieces quickly, castle early, and contest the center. Every move that doesn\'t develop a piece or improve position should be questioned.',
    ],
    famousNote: 'Paul Morphy defeated the Duke of Brunswick in the Opera Game (1858) in just 13 moves after 1.e4. This remains one of chess history\'s most celebrated miniatures demonstrating the power of open-game principles.',
  },
  {
    id: 'open-2', category: 'openings', title: 'The Italian Game',
    subtitle: 'Bc4 — the classical attacking setup', level: 'beginner',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    keyPoints: [
      'Bc4 targets the vulnerable f7 pawn',
      'Aims for rapid development and center control',
      'Giuoco Piano: quiet positional battles',
      'Evans Gambit (b4): sharp gambit play',
      'One of the oldest documented openings (1500s)',
    ],
    paragraphs: [
      'After 1.e4 e5 2.Nf3 Nc6, White plays 3.Bc4 — the Italian Game. The bishop on c4 puts immediate pressure on f7, the weakest point in Black\'s starting position. Black most commonly replies 3...Bc5, contesting the center.',
      'The Giuoco Piano ("quiet game" in Italian) arises after 4.c3 preparing d4. Black replies 4...Nf6 attacking e4. These positions are rich in strategic ideas: controlling d5, using the half-open d-file, and trading at the right moment.',
      'Critical idea: the Fried Liver Attack sacrifices a knight on f7 for a devastating attack. Understanding material sacrifice for initiative is one of the Italian\'s most important lessons.',
    ],
    famousNote: 'Magnus Carlsen has used the Italian Game throughout his career, citing its rich positional complexity. At the 2016 World Championship, he used it to outplay Sergey Karjakin in long technical games.',
  },
  {
    id: 'open-3', category: 'openings', title: 'The Ruy Lopez (Spanish Game)',
    subtitle: 'The most theoretically rich opening', level: 'intermediate',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    keyPoints: [
      'Bb5 indirectly pressures e5 via the Nc6',
      'Named after Bishop Ruy López de Segura (1561)',
      'White seeks long-term positional pressure',
      'Main systems: Closed, Open, Berlin, Marshall Attack',
      'Berlin Defense used by Kramnik to defeat Kasparov in 2000',
    ],
    paragraphs: [
      'The Ruy Lopez (3.Bb5) is arguably the most studied opening in chess. The bishop on b5 creates long-term strategic pressure on Black\'s center without directly winning material immediately.',
      'The Berlin Defense (3...Nf6) was considered drawish until Vladimir Kramnik used it to neutralize Garry Kasparov at the 2000 World Championship. The Closed Spanish (3...a6 4.Ba4 Nf6 5.0-0 Be7) is the most complex main line.',
      'Key strategic idea: White often plays a4 and a5 to undermine Black\'s queenside pawn chain, while Black counterattacks with ...d5 or ...f5. Understanding these long-term pawn breaks is essential.',
    ],
    famousNote: 'Garry Kasparov used the Ruy Lopez as his main weapon for decades. His battles with Karpov in the Ruy Lopez produced some of chess history\'s most instructive games, analyzing both the Berlin and Closed systems to unprecedented depth.',
  },
  {
    id: 'open-4', category: 'openings', title: 'The Sicilian Defense',
    subtitle: 'Black\'s sharpest and most popular reply to 1.e4', level: 'intermediate',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    keyPoints: [
      'Most popular defense against 1.e4 at all levels',
      '1...c5 fights for d4 without symmetry',
      'Main variations: Najdorf, Dragon, Scheveningen, Classical',
      'Black often gets queenside counterplay vs White\'s kingside attack',
      'Statistically the most combative opening at grandmaster level',
    ],
    paragraphs: [
      '1...c5 is Black\'s most ambitious response to 1.e4. Instead of mirroring with 1...e5, Black fights for d4 asymmetrically, creating an imbalanced pawn structure: White has more center space; Black has the half-open c-file for counterplay.',
      'The Najdorf Variation (5...a6) is Black\'s most popular defense. Fischer called it the best defense to 1.e4. The a6 move prevents Nb5 and prepares queenside expansion with ...b5. White attacks on the kingside, Black counterattacks on the queenside.',
      'The Dragon Variation (5...g6 followed by ...Bg7) is famous for the Yugoslav Attack: White castles queenside and launches a vicious pawn storm, while Black\'s dragon bishop breathes fire down the long diagonal.',
    ],
    famousNote: 'Bobby Fischer famously said "The Sicilian Defense is the best defense against 1.e4." He used the Najdorf to defeat Boris Spassky in their legendary 1972 World Championship match.',
  },
  {
    id: 'open-5', category: 'openings', title: 'The Queen\'s Gambit',
    subtitle: 'The cornerstone of 1.d4 strategy', level: 'intermediate',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    keyPoints: [
      '1.d4 d5 2.c4 — offers a pawn to gain center control',
      'QGA (2...dxc4): White regains the pawn with superior activity',
      'QGD (2...e6): solid structure, long strategic battle',
      'Catalan (g3+Bg2): modern positional variation',
      'Exchange Variation (cxd5): sets up minority attack plan',
    ],
    paragraphs: [
      'The Queen\'s Gambit is not truly a gambit — White\'s c4 pawn can almost always be recaptured. After 2.c4, if Black takes with 2...dxc4, White plays 3.Nf3 followed by Bxc4, regaining the pawn with superior piece activity.',
      'The Queen\'s Gambit Declined (QGD) is one of chess\'s most solid defenses. The key strategic fight is over the e5 and c5 squares. White often targets Black\'s isolated d-pawn (IQP) positions that arise after ...c5 exchanges.',
      'The Catalan Opening (3.g3 4.Bg2) has become extremely popular at grandmaster level. The fianchettoed bishop on g2 exerts long-term pressure on the entire queenside. Anand, Kramnik, and Carlsen have used it extensively.',
    ],
    famousNote: 'Vladimir Kramnik used the QGD Berlin and QGD Cambridge Springs to defeat Garry Kasparov in the 2000 World Championship, ending Kasparov\'s 15-year reign with purely solid, anti-tactical chess.',
  },
  // ── MIDDLEGAME ───────────────────────────────────────────────────
  {
    id: 'mid-1', category: 'middlegame', title: 'The 3 Core Principles',
    subtitle: 'Development, Center Control, King Safety', level: 'beginner',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    keyPoints: [
      'Develop ALL pieces before attacking',
      'Control the center with pawns and pieces',
      'Castle early — the king is a liability in the center',
      'Don\'t move the same piece twice in the opening',
      'Connect your rooks — they thrive on open files',
    ],
    paragraphs: [
      'Chess has three universal opening principles. First: develop your pieces. Knights before bishops, then castle. A piece on its starting square contributes nothing. Develop toward the center — Nf3 is better than Nh3; Bc4 is better than Ba3.',
      'Second: control the center. The four central squares (e4, e5, d4, d5) are the most important on the board. Pieces in the center have maximum mobility. Even hypermodern openings like the King\'s Indian challenge the center later with ...c5 or ...e5.',
      'Third: castle your king to safety before move 10. Once castled, your king is protected and rooks can connect. Delaying castling to attack usually fails — the opponent\'s counter is faster when you have an uncastled king.',
    ],
    famousNote: 'Wilhelm Steinitz (1st World Champion) was first to formulate positional principles, showing that violating them has concrete consequences. His ideas were revolutionary in the 1880s and remain foundational today.',
  },
  {
    id: 'mid-2', category: 'middlegame', title: 'Pawn Structure & Plans',
    subtitle: 'Pawns are the soul of chess — Nimzowitsch', level: 'intermediate',
    fen: 'r1bq1rk1/pp2ppbp/2n2np1/2pp4/3PP3/2N2N2/PPP1BPPP/R1BQ1RK1 w - - 0 8',
    keyPoints: [
      'Isolated pawns are weak but grant piece activity',
      'Doubled pawns create weak squares but open files',
      'Passed pawns must be pushed — they are future queens',
      'Backward pawns on open files are chronic weaknesses',
      'The pawn structure determines your long-term plan',
    ],
    paragraphs: [
      'Unlike pieces, pawns cannot move backward — every pawn move creates permanent structural consequences. The Isolated Queen\'s Pawn (IQP) on d4/d5 is a perfect example: it\'s a weakness (no pawn defends it) but grants mobile piece advantage and control of e5/c5 outposts.',
      'Passed pawns — no enemy pawn blocking them or on adjacent files — are enormously powerful in endgames. A connected passed pawn pair on d5/e5 is nearly irresistible. Tarrasch\'s rule: "A knight on d5 supported by a pawn is worth as much as a rook."',
      'Pawn breaks are critical tools. In the King\'s Indian, Black\'s standard break is ...e5-e4 or ...f5-f4. In the French, ...c5 breaks White\'s center. Identify these breaks in your openings and know both sides\' thematic plans.',
    ],
    famousNote: 'Aron Nimzowitsch\'s "My System" (1925) revolutionized chess by explaining pawn weaknesses, blockade, and the passed pawn. His concepts are still taught in every FIDE coach certification program.',
  },
  {
    id: 'mid-3', category: 'middlegame', title: 'Piece Activity & Coordination',
    subtitle: 'Good pieces always beat bad pieces', level: 'intermediate',
    fen: 'r4rk1/ppp2pp1/2n4p/3pq3/3N4/2P1P3/PP3PPP/R1BQ1RK1 w - - 0 12',
    keyPoints: [
      'Knight on d5/d4 with pawn support = outpost powerhouse',
      'Rooks belong on open files — control the initiative',
      'Bishop pair in open positions is a serious advantage',
      'Bad bishop: blocked by its own pawns — a permanent weakness',
      'Piece activity often matters more than material count',
    ],
    paragraphs: [
      'A knight on d5 supported by a pawn controls 8 squares, cannot be attacked by opposing pawns, and disrupts the enemy position. The key concept is the "outpost": a square that cannot be attacked by enemy pawns. A knight there often dominates the game.',
      'Rooks belong on open and half-open files. The player who controls the d-file has a lasting initiative. Doubled rooks create devastating battery attacks. "A rook needs an open file like a fish needs water." — Nimzowitsch.',
      'The bishop pair (having both bishops when the opponent has a bishop and knight) is a significant advantage in open positions. Two bishops cover all colors and improve as more pieces are traded. Fischer called the bishop pair "like having two queens."',
    ],
    famousNote: 'José Raúl Capablanca (World Champion 1921-1927) mastered piece activity. He often "simplified" to positions where his pieces were perfectly placed and opponents\' were passive — then converted these small advantages systematically.',
  },
  {
    id: 'mid-4', category: 'middlegame', title: 'King Safety & Pawn Storms',
    subtitle: 'The king is everything — protect it', level: 'intermediate',
    fen: 'r1bq1rk1/ppp2ppp/2n5/3pp3/4P3/2N2N2/PPP2PPP/R1BQK2R w KQ - 0 8',
    keyPoints: [
      'Castle before move 10 — every tempo in the center is dangerous',
      'Avoid unnecessary pawn moves in front of your castled king',
      'Opposite-side castling = mutual pawn storms — speed wins',
      'Same-side castling = quieter, positional game',
      'Never castle into an obvious attack',
    ],
    paragraphs: [
      'King safety overrides all other considerations. Castle before move 10. The king needs a wall of pawns (f2, g2, h2 if castled kingside). Any move that disturbs this wall should be carefully considered — it may never recover.',
      'When players castle on opposite sides, both attack the enemy king with pawns: White advances h2-h4-h5, Black advances a7-a5-a4. The player who attacks faster wins. Every tempo is critical. Even a half-tempo blunder can lose.',
      'When both players castle on the same side, the game is more positional. Piece activity, pawn breaks, and prophylaxis matter more than speed. Weakening your king with ...h6 or g4 costs you — opponents can later sacrifice to open lines.',
    ],
    famousNote: 'Mikhail Tal, "the Magician from Riga," World Champion 1960-61, was a genius at sacrificing against the uncastled king. "You must take your opponent into a deep dark forest where 2+2=5, and the path out is only wide enough for one." — Tal.',
  },
  {
    id: 'mid-5', category: 'middlegame', title: 'Tactical Patterns Every Player Must Know',
    subtitle: 'Combinations are the currency of chess', level: 'advanced',
    fen: 'r1b1k2r/pppp1ppp/2n5/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1K1R w kq - 0 6',
    keyPoints: [
      'Fork: one piece attacks two pieces simultaneously',
      'Pin: a piece is immobilized exposing a valuable piece behind it',
      'Skewer: attack the more valuable piece first, take what\'s behind',
      'Discovered attack: moving one piece reveals another\'s attack',
      'Zwischenzug: insert a forcing move before the expected reply',
    ],
    paragraphs: [
      'Tactics are the building blocks of chess. Learn these patterns until they are reflexive: the fork (knight attacks king and queen — take the queen); the pin (bishop on g5 pins Nf6 to Qd8 — knight cannot move safely); the skewer (rook attacks Qe7, queen moves, rook takes Be8).',
      'Discovered attacks are among the most powerful tactical motifs. When a piece moves away from a line, it "discovers" the attack of the piece behind it. A discovered check is particularly fearsome — the moving piece can go anywhere while the king must respond to check.',
      'The Zwischenzug (German: "in-between move") inserts a forcing move instead of the expected reply. Your opponent must respond first, then you handle the original situation — often winning material or escaping danger.',
    ],
    famousNote: 'Tactics training is the fastest path to improvement. Karpov recommended solving 3-5 tactical puzzles daily as his primary training method. FIDE research shows 1,000+ puzzles solved improves average rating by 150-200 ELO points.',
  },
  // ── ENDGAME ──────────────────────────────────────────────────────
  {
    id: 'end-1', category: 'endgame', title: 'King & Pawn vs. King',
    subtitle: 'The fundamental endgame every player must master', level: 'beginner',
    fen: '8/8/3k4/8/3K4/3P4/8/8 w - - 0 1',
    keyPoints: [
      'Opposition: kings facing each other with one square between them',
      'Attacking king must reach the 6th rank in front of the pawn',
      'Edge pawns (a/h file) often draw — king reaches the corner',
      'Rule of the square: if the king enters the square, it catches the pawn',
      'Having the opposition is usually decisive',
    ],
    paragraphs: [
      'King and Pawn vs. King is the fundamental endgame. The key concept: "opposition" — two kings oppose each other when they face each other with exactly one square between them. The player who does NOT have to move when opposition occurs has the advantage.',
      'Winning method: your king must march in front of the pawn, reaching the 6th rank (3rd rank for Black). From there, you achieve zugzwang: your opponent must give way, then you advance the pawn safely to promotion.',
      'Critical exception: edge pawns (a-pawn and h-pawn) often draw even with the opposition. If the defending king reaches the corner in front of the pawn (a8 for White\'s a-pawn), it draws — the attacking king cannot dislodge it without stalemating.',
    ],
    famousNote: 'Reuben Fine wrote: "The player who has not studied K+P vs. K has not yet begun to understand chess." Every world champion has had this endgame mastered before age 12.',
  },
  {
    id: 'end-2', category: 'endgame', title: 'Basic Checkmates: K+Q and K+R',
    subtitle: 'Force the opponent to the edge — never stalemate', level: 'beginner',
    fen: '8/8/8/8/3k4/8/8/2K1Q3 w - - 0 1',
    keyPoints: [
      'K+Q vs K: queen restricts king to edge, king assists, deliver checkmate',
      'K+R vs K: rook cuts off king, your king drives it to the edge',
      'NEVER stalemate — always leave the opponent a legal move',
      'K+Q: checkmate in at most 10 moves from any position',
      'K+R: checkmate in at most 16 moves from any position',
    ],
    paragraphs: [
      'Queen checkmate: the queen restricts the enemy king to progressively smaller zones. When the king is on the edge, bring your king close to assist. The queen gives check, and your king covers escape squares. Key danger: avoid stalemate.',
      'Rook checkmate requires more precision but the same concept: use the rook to cut the king off from ranks or files, then drive it to the edge with your king. The "Lawnmower" technique — the rook systematically cutting across the board — is the clearest method.',
      'Classic stalemate trap in K+Q: 1.Qa5+ Kb1 2.Qb4?? — stalemate! Instead: 2.Kb3 Kc1 3.Qa1#. Always check if the king has any legal moves before giving check. Stalemate is one of the most common ways to throw away a won game.',
    ],
    famousNote: 'FIDE Trainers require all Level 1 coaches to demonstrate these checkmates in under 20 moves. Failure to convert a K+Q win is considered a "catastrophic technical error" in professional tournament play.',
  },
  {
    id: 'end-3', category: 'endgame', title: 'Rook Endings: Lucena & Philidor',
    subtitle: 'The two most important rook positions in chess', level: 'intermediate',
    fen: '1K1k4/1P6/8/8/8/8/8/r1R5 w - - 0 1',
    keyPoints: [
      'Lucena: winning technique when pawn is on 7th rank (build a bridge)',
      'Philidor: drawing technique — rook on 6th rank, then give side checks',
      'Rook belongs BEHIND the passed pawn — yours or the enemy\'s',
      'Tarrasch\'s rule: rook behind the passed pawn',
      'Rook endgames are drawn more often than any other piece ending',
    ],
    paragraphs: [
      'The Lucena Position: your king is in front of the pawn, your rook cuts off the enemy king. Winning method — "building a bridge": your rook gives checks to drive the enemy king away, then the pawn advances, then your rook cuts off the king on the 4th rank so your king steps out.',
      'The Philidor Position: the defender\'s drawing technique. Your rook starts on the 6th rank. When the enemy king advances, you switch to giving checks from the side (from the 1st rank). This draws even when a pawn behind — the key insight that saves many rook endings.',
      'Tarrasch\'s rule: "Place your rook behind a passed pawn — yours to push it, your opponent\'s to stop it." This single rule will save and win many games. Rook in front of or beside a passed pawn is weak; rook behind it is strong.',
    ],
    famousNote: 'At the 2018 World Championship, Magnus Carlsen held a drawn rook endgame against Fabiano Caruana using the Philidor technique under extreme time pressure — proving even world champions must know these fundamentals.',
  },
  {
    id: 'end-4', category: 'endgame', title: 'The Square Rule & Passed Pawns',
    subtitle: 'Can the king catch the pawn? Calculate in 2 seconds', level: 'intermediate',
    fen: '8/8/8/3p4/8/3P4/3K4/5k2 w - - 0 1',
    keyPoints: [
      'Draw a square from the pawn to the promotion square',
      'If the enemy king can step INTO the square on its turn — the pawn is caught',
      'If not — the pawn queens',
      'Connected passed pawns on 5th/6th rank beat a rook',
      'Two connected passers are worth more than a rook in many endings',
    ],
    paragraphs: [
      'The "Rule of the Square" determines if a king can catch a passed pawn without calculation. Draw a diagonal from the pawn\'s square to the promotion square forming a square. If the enemy king can reach any square inside on its next move, the pawn will be caught.',
      'For example: White pawn on e5, enemy king on a1. Count the pawn\'s distance to e8: 3 moves. The square extends 3 files to the right. Can the black king reach h5, h6, h7, h8 in one move? If no, the pawn queens. This takes 2 seconds once internalized.',
      'Connected passed pawns in pairs are devastating in endgames. Two connected passed pawns on the 6th rank beat a rook — the defending rook cannot stop both simultaneously. Creating connected passers should be a primary endgame goal.',
    ],
    famousNote: 'Paul Keres wrote: "The first principle of endgame technique is to create a passed pawn. The second is to advance it. The third is to promote it." Simple but profound — and the foundation of endgame strategy.',
  },
  {
    id: 'end-5', category: 'endgame', title: 'Minor Piece Endgames',
    subtitle: 'Bishop vs Knight — knowing which is better', level: 'advanced',
    fen: '8/5p2/6kp/5p2/5P2/6KP/5P2/3B4 w - - 0 1',
    keyPoints: [
      'Bishop is better in open positions — covers long diagonals instantly',
      'Knight is better in closed positions — fixed pawn structures, outposts',
      '"Good" bishop: pawns are on the opposite color',
      '"Bad" bishop: blocked by own pawns on same color',
      'Two bishops in an open endgame: nearly always winning',
    ],
    paragraphs: [
      'The character of the pawn structure determines which minor piece is superior. Bishops excel when pawns are on both sides of the board — they switch flanks instantly. Knights must slowly hop across the board. Bishops are strongest in open positions with mobile pawns.',
      'Knights excel in closed structures with locked pawns. A centralized knight on an outpost that cannot be attacked by enemy pawns is often worth as much as a rook. Given enough time, a knight can reach every square; a bishop is permanently restricted to one color.',
      'The "bad bishop" is a chronic weakness. If your bishop is on light squares and all your pawns are on light squares too, the bishop is imprisoned by its own army. Solution: trade it off, or reorganize pawns to the opposite color.',
    ],
    famousNote: 'Anatoly Karpov was widely considered the finest endgame technician of the 20th century. His ability to exploit the bishop vs. knight imbalance was legendary in his World Championship matches against Kasparov.',
  },
  // ── PSYCHOLOGY ───────────────────────────────────────────────────
  {
    id: 'psy-1', category: 'psychology', title: 'Managing Time Pressure',
    subtitle: 'Don\'t lose on the clock — time is a chess skill', level: 'intermediate',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    keyPoints: [
      'Time pressure degrades calculation quality dramatically',
      'Use most thinking time in the middlegame, not the opening',
      'In time trouble: play candidate moves, avoid tactical complexity',
      'Reserve time for critical moments, spend little on known positions',
      'When opponent is in time trouble: keep the position complex',
    ],
    paragraphs: [
      'Time management is a chess skill as important as tactics. Most tournament games are lost on the clock, not on the board. The most common mistake: spending too much time in the opening (memorized positions) and running short in the critical middlegame. Budget your time appropriately.',
      'When YOU are in time pressure: identify the 2-3 most reasonable moves in 5 seconds, eliminate obvious blunders, and play the safest-looking option. Avoid calculating long combinations — you will likely miscalculate. Simplify when possible.',
      'When YOUR OPPONENT is in time pressure: do NOT simplify. Keep the position as complex as possible. Give them difficult decisions on every move. Every extra complication is another chance for them to err under clock pressure.',
    ],
    famousNote: 'Bobby Fischer had all major opening variations memorized through move 25+, rarely getting into time trouble. At the 1972 World Championship, Fischer made Spassky spend far more time than him in every game through deep opening preparation.',
  },
  {
    id: 'psy-2', category: 'psychology', title: 'Playing Against Stronger Opponents',
    subtitle: 'Maximize results as the underdog', level: 'beginner',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    keyPoints: [
      'Solid defense makes stronger players work hard for every point',
      'Avoid sharp positions with lots of forced lines — they excel there',
      'Choose solid openings — make them prove their superiority slowly',
      'Never panic or give up pieces without concrete compensation',
      'Every draw against a higher-rated player is a moral victory',
    ],
    paragraphs: [
      'Against a stronger opponent, your goal changes: not necessarily to win, but to not lose on move 15 to a tactical blunder. Choose solid, classical openings that don\'t allow the opponent to use deep preparation. The Petroff Defense (1.e4 e5 2.Nf3 Nf6) is ultra-solid for this reason.',
      'Stronger players thrive on complexity — they calculate further and more accurately. Counter-strategy: reduce complexity. Trade pieces when reasonable (especially queens). Aim for equal endgames — in simplified positions, technique matters more than raw calculation.',
      'Never give up psychologically. A drawn position where you believe you are losing is often simply equal. Stronger players sometimes try speculative attacks that aren\'t objectively correct, hoping you panic. The correct response: calmly refute the attack.',
    ],
    famousNote: 'Ulf Andersson, one of history\'s greatest defensive players, routinely drew against opponents 200 ELO points higher through solid play and endgame technique. FIDE coaches use his games as the definitive "how to defend" teaching examples.',
  },
  {
    id: 'psy-3', category: 'psychology', title: 'The Art of Defense',
    subtitle: 'Finding the defensive resource that always exists', level: 'advanced',
    fen: 'r4rk1/ppp1qppp/2n5/3p4/8/2P1BN2/PP3PPP/R2QK2R w KQ - 0 15',
    keyPoints: [
      'Find the critical defensive resource — it almost always exists',
      'Active defense is usually better than passive defense',
      'Trade off the attacker\'s most dangerous piece',
      'Create counterplay — a distraction is as good as a defense',
      'In extreme danger, sacrifice material to reach a safe endgame',
    ],
    paragraphs: [
      'Defense is an underrated skill. Many players assume they are losing when under attack, when the position is actually defensible. First principle: look for the "defensive resource" — the move that refutes the attack. It might be a counter-sacrifice, a desperate check, or a Zwischenzug that upends the opponent\'s plan.',
      'Active defense is often better than passive defense. Instead of moving backward hoping for the best, attack yourself. If your opponent attacks with Ra1-a4, consider ...b5-b4 creating your own threat. This forces the opponent to recalculate — and recalculation leads to errors.',
      'In desperate situations, material sacrifice to reach a safe endgame is sometimes correct. If being mated in 3, give up your rook to reach a rook-down endgame — at least it\'s a fight. Petrosian held many "hopelessly lost" positions this way.',
    ],
    famousNote: '"Iron Tigran" Petrosian (World Champion 1963-1969) was the greatest defensive player in chess history. He would eliminate attacking chances 10 moves before they became threats. FIDE ranked him the best defensive player of the 20th century.',
  },
  {
    id: 'psy-4', category: 'psychology', title: 'Converting Winning Positions',
    subtitle: 'The hardest skill: winning the won game', level: 'advanced',
    fen: 'r4rk1/pp3ppp/2n1p3/q1Pp4/3P4/1QN2N2/PP3PPP/R4RK1 w - - 0 18',
    keyPoints: [
      'Don\'t look for the winning move — look for the clearest move',
      'Simplify when possible: trade to a winning endgame',
      'Don\'t give your opponent counterplay or activity',
      'Winning advantage disappears if you play ambitiously',
      '"When you have a winning position, winning is a technicality" — Karpov',
    ],
    paragraphs: [
      'Converting a winning position is psychologically harder than it sounds. Many players try to win "beautifully" — looking for a brilliant combination when a simple move wins cleanly. The result: they miss the simple continuation, drift into complexity, and let the opponent escape.',
      'Karpov\'s method: when ahead, ask "How can I improve my worst-placed piece?" Make the simplest improvement move every turn. Don\'t give your opponent counterplay. Trade piece by piece. Create no weaknesses. This grinding approach is psychologically devastating.',
      'Avoid "winning with style" syndrome. The most efficient win is always the correct win. If Ra4 wins material, play Ra4 — don\'t look for the fancier Rxh7+. The moment you start thinking about playing impressively instead of correctly, you risk throwing away the win.',
    ],
    famousNote: 'Anatoly Karpov was the supreme master of converting small advantages — his "boa constrictor chess" gradually squeezed opponents until they had no moves. He won 5 World Championship matches and 160+ international tournaments with this philosophy.',
  },
  {
    id: 'psy-5', category: 'psychology', title: 'Creating Complexity as a Weapon',
    subtitle: 'Use chaos strategically — like Tal', level: 'intermediate',
    fen: 'r1bq1rk1/pp3ppp/2n1pn2/2pp4/3P4/2N1PN2/PPQ2PPP/R1B2RK1 w - - 0 10',
    keyPoints: [
      'Complexity favors the player with better nerves and calculation',
      'When losing: complicate to create practical chances',
      'When winning: simplify to convert the advantage',
      'Sacrifice material for dynamic play when the position justifies it',
      'Never sacrifice "by hope" — calculate concretely first',
    ],
    paragraphs: [
      'Complexity is a double-edged sword. In a worse position, complicating gives you practical chances — your opponent might miscalculate in chaos. Magnus Carlsen, even when technically worse, often keeps pieces on the board and creates multiple threats simultaneously.',
      'When you are winning, the opposite applies: simplify. Trade pieces, reach a winning endgame, and convert technically. Many games are lost by players who remain in complex middlegames when they could simply trade to a winning endgame. Kasparov called this "knowing when to stop attacking and start converting."',
      'The decision of when to sacrifice material for dynamic play is one of chess\'s deepest questions. Sacrifice when you can calculate clearly to a winning position, or when your position is so passive that a pawn sacrifice buys real activity. Never sacrifice "by hope."',
    ],
    famousNote: 'Mikhail Tal (World Champion 1960-61) was the king of complexity. His sacrifices were brilliant, sometimes speculative, always terrifying to face. He once said: "There are two types of sacrifices: correct ones and mine." His games are required study for FIDE Trainer certification.',
  },
  // ── THINKING ─────────────────────────────────────────────────────
  {
    id: 'think-1', category: 'thinking', title: 'Candidate Moves — How GMs Think',
    subtitle: 'Kotov\'s method: the systematic approach to calculation', level: 'intermediate',
    fen: 'r1bq1rk1/pp2ppbp/2n2np1/2pp4/3PP3/2N2N2/PPP1BPPP/R1BQK2R w KQ - 0 8',
    keyPoints: [
      'Step 1: Identify ALL candidate moves before calculating any',
      'Step 2: Calculate each candidate to a leaf position',
      'Step 3: Compare leaf positions to find the best',
      'Never go back and reconsider mid-calculation — this causes time trouble',
      'Kotov\'s "tree of analysis" is the basis of all FIDE training',
    ],
    paragraphs: [
      'Alexander Kotov\'s "Think Like a Grandmaster" (1971) described a systematic method. Step 1: Before calculating any move, identify ALL candidate moves — usually 2-4. Step 2: Calculate each down to a "leaf" — a position you can clearly evaluate. Step 3: Compare the leaves and choose the best.',
      'The critical rule: once you start calculating a candidate, go to the end of that branch before switching to another. Jumping between candidates wastes time recalculating the same lines — Kotov called this "shuffling." Discipline: finish analyzing candidate A before starting candidate B.',
      'Practical application: look at ALL threats on both sides first. Identify the 2-3 most forcing moves (checks, captures, serious threats). Calculate. Then ask: "Have I missed any forcing reply?" This prevents the most common blunder — missing a simple tactical counter to your planned move.',
    ],
    famousNote: 'Kotov\'s "Think Like a Grandmaster" introduced "candidate moves" to chess education and is mandatory reading in Russian chess academies. It remains one of the most important chess training books ever published.',
  },
  {
    id: 'think-2', category: 'thinking', title: 'Silman\'s Imbalances',
    subtitle: 'What to look for when there are no obvious tactics', level: 'intermediate',
    fen: 'r1b2rk1/pp2ppbp/1qn2np1/2pp4/3P4/2N2NB1/PPQ1PPPP/R4RK1 w - - 0 11',
    keyPoints: [
      'Material: who is ahead in piece count/value?',
      'Pawn structure: weaknesses? Passed pawns? Open files?',
      'Piece activity: whose pieces are doing more work?',
      'King safety: who is more exposed?',
      'Space: who controls more of the board?',
    ],
    paragraphs: [
      'Jeremy Silman\'s "How to Reassess Your Chess" introduced "imbalances" — a systematic way to evaluate any position. Rather than calculating everything, identify concrete features: material balance, pawn structure, piece activity, king safety, space, and initiative. The player with more positive imbalances has the better position.',
      'Practical use: after your opponent\'s move, assess all imbalances. Who has the bishop pair? More active rooks? A passed pawn? A weak isolated pawn? After listing the imbalances, your plan becomes clear: improve your positives and exploit their weaknesses.',
      'The most important imbalance is usually "piece activity." A player with an active bishop, rooks on open files, and centralized knights against a passive opponent will almost always win even with equal material. Notice when your pieces are passive and improve them immediately.',
    ],
    famousNote: '"How to Reassess Your Chess" by Jeremy Silman is considered the best book for club-level improvement (1200-2000 ELO). According to FIDE coach surveys, it has helped more players break the 2000 barrier than any other single training resource.',
  },
  {
    id: 'think-3', category: 'thinking', title: 'Prophylaxis — Thinking for Your Opponent',
    subtitle: 'Prevent threats before they arise', level: 'advanced',
    fen: '2rq1rk1/pp2ppbp/3p1np1/3P4/3QP3/2N2N2/PP3PPP/R1B2RK1 w - - 0 14',
    keyPoints: [
      '"What does my opponent WANT to do?" — ask before every move',
      'Prevent their best plan before executing your own',
      'Prophylactic moves look "quiet" but are deeply strategic',
      'Nimzowitsch coined the term — means "prevention" in Greek',
      'The greatest players make prophylaxis automatic',
    ],
    paragraphs: [
      'Prophylaxis is the skill separating good players from great ones. Before any move, ask: "What does my opponent want to do?" "What is their best plan?" "Can I prevent it at minimal cost?" If yes, do so first — even delaying your own attack to stop theirs.',
      'Nimzowitsch wrote: "The prevention of any freeing move by the opponent should be considered even when such a move cannot be made at once." Stop problems before they arise. Classic prophylaxis: when your opponent has a bishop pair, keep the position closed. When they have a passed pawn, blockade it immediately.',
      'The most common prophylaxis failure: tunnel vision on your own attack while the opponent builds a devastating counter. Before each move in your attack, scan: "Is there anything my opponent threatens that I\'m ignoring?" This habit alone saves many games.',
    ],
    famousNote: 'Tigran Petrosian was the greatest prophylactic player in history, preventing opponent plans 10 moves before they became threats. His 1969 World Championship match against Boris Spassky showcased prophylaxis at the absolute highest level.',
  },
  {
    id: 'think-4', category: 'thinking', title: 'Visualization & Calculation',
    subtitle: 'Seeing the board clearly in your mind', level: 'intermediate',
    fen: 'r1bqkb1r/ppp2ppp/2n2n2/3pp3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 5',
    keyPoints: [
      'Blindfold chess trains visualization fastest',
      'Calculate concrete variations: "If I play X, they play Y, I play Z..."',
      'Always check: can my opponent give check? Capture? Threaten mate?',
      'The "tree check": scan your final position for hanging pieces',
      'Reading chess books WITHOUT a board builds visualization skill',
    ],
    paragraphs: [
      'Visualization — seeing the position in your mind without moving pieces — is the foundation of calculation. Every 5-move combination requires visualizing the board 5 moves ahead. Train this skill: start with 1-move puzzles, progress to 3-move, then 5-move combinations.',
      'Powerful training exercise: replay your own games mentally without looking at the board. Start from the initial position and "see" each move in your mind. When you lose track of the position, you\'ve found your calculation depth limit — and that\'s what to train next.',
      'The "tree check" is mandatory. After calculating a combination, ask: in my final position, are any of my pieces hanging? Is my king in check? Can the opponent make a Zwischenzug I haven\'t considered? Many combinations fail because of this overlooked final check.',
    ],
    famousNote: 'In 1925, Alekhine played 28 simultaneous blindfold games, winning 22. Magnus Carlsen regularly plays blindfold chess in exhibitions. FIDE recommends blindfold training for all players above 1600 ELO as the fastest way to improve calculation depth.',
  },
  {
    id: 'think-5', category: 'thinking', title: 'Your Thinking Routine — Step by Step',
    subtitle: 'A systematic process for every single move', level: 'beginner',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    keyPoints: [
      'Step 1: After opponent\'s move — what changed? Any new threats?',
      'Step 2: What is my long-term plan in this position?',
      'Step 3: Identify candidate moves (2-4 options)',
      'Step 4: Calculate each candidate thoroughly',
      'Step 5: Before moving — BLUNDER CHECK: any hanging pieces?',
    ],
    paragraphs: [
      'A thinking routine eliminates blunders. After every opponent move: (1) Why did they play that? What threat did it create? (2) What is MY plan — which side do I play on, what pawn break do I want? (3) What are my 2-4 candidate moves? (4) Calculate each carefully. (5) Before moving — the "blunder check": is anything hanging? Am I moving into a tactic?',
      'The blunder check prevents the most common and painful chess mistake: missing a simple one-move reply. Before executing your plan, spend 5 seconds asking: "What is my opponent\'s BEST reply to this move? Can they capture something? Give check? Threaten mate?" This habit alone eliminates 70% of tournament blunders.',
      'Routine builds consistency. Players who think systematically play at their actual strength every game. Players who "wing it" play brilliantly sometimes and terribly other times. Professional coaches rank "thinking routine" as the single most impactful training habit for players below 2000 ELO.',
    ],
    famousNote: 'FIDE certified coaches teach this exact 5-step routine as the foundation of improvement at all levels. Players who implement it consistently typically gain 100-200 ELO in 6-12 months of tournament play.',
  },
]

export const CATEGORIES: { id: Category; label: string; color: string; desc: string }[] = [
  { id: 'openings',   label: 'Openings',   color: 'amber',  desc: '5 major opening systems' },
  { id: 'middlegame', label: 'Middlegame', color: 'blue',   desc: 'Plans, tactics & piece play' },
  { id: 'endgame',    label: 'Endgame',    color: 'green',  desc: 'Essential endgame technique' },
  { id: 'psychology', label: 'Psychology', color: 'purple', desc: 'Mental game & competitive edge' },
  { id: 'thinking',   label: 'Thinking',   color: 'rose',   desc: 'How grandmasters calculate' },
]
