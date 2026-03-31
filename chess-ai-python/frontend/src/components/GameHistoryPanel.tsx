import React, { useState, useCallback, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, RotateCcw, FileText, TrendingUp, Calendar,
  Clock, Award, AlertTriangle, Star, Zap,
} from 'lucide-react'
import clsx from 'clsx'

const API = 'http://localhost:8000'

/* ── Types ─────────────────────────────────────────────────────────── */
interface GameSummary {
  game_id: string
  white_id: string
  black_id: string
  result: string
  termination: string
  time_control: string
  time_category: string
  opening_eco: string
  opening_name: string
  total_moves: number
  rated: boolean
  white_rating_before: number
  black_rating_before: number
  white_rating_after: number | null
  black_rating_after: number | null
  created_at: string
  finished_at: string | null
}

interface MoveData {
  move_number: number
  uci: string
  san: string
  fen_after: string
  eval_cp: number | null
  eval_mate: number | null
  time_spent_ms: number | null
  clock_remaining_ms: number | null
  quality: string
}

interface AnnotationMove {
  move_number: number
  uci: string
  san: string
  eval_cp: number | null
  eval_mate: number | null
  best_move: string | null
  delta_cp: number | null
  quality: string
  symbol: string
  comment: string
}

interface AnnotationResult {
  annotated_pgn: string
  move_count: number
  summary: { counts: Record<string, number>; accuracy: number }
  moves: AnnotationMove[]
}

/* ── Quality helpers ────────────────────────────────────────────────── */
const QUALITY_META: Record<string, { symbol: string; color: string; bg: string; label: string }> = {
  brilliant:  { symbol: '!!', color: '#22d3ee', bg: 'bg-cyan-500/20',   label: 'Brilliant' },
  good:       { symbol: '!',  color: '#22c55e', bg: 'bg-green-500/20',  label: 'Good' },
  best:       { symbol: '',   color: '#94a3b8', bg: '',                  label: 'Best' },
  interesting:{ symbol: '!?', color: '#3b82f6', bg: 'bg-blue-500/20',   label: 'Interesting' },
  inaccuracy: { symbol: '?!', color: '#eab308', bg: 'bg-yellow-500/20', label: 'Inaccuracy' },
  mistake:    { symbol: '?',  color: '#f97316', bg: 'bg-orange-500/20', label: 'Mistake' },
  blunder:    { symbol: '??', color: '#ef4444', bg: 'bg-red-500/20',    label: 'Blunder' },
  book:       { symbol: '',   color: '#a855f7', bg: 'bg-purple-500/20', label: 'Book' },
}

function QualityBadge({ quality, symbol }: { quality: string; symbol?: string }) {
  const meta = QUALITY_META[quality] ?? QUALITY_META['best']
  const sym = symbol ?? meta.symbol
  if (!sym) return null
  return (
    <span className={clsx('text-xs font-bold px-1 rounded', meta.bg)}
          style={{ color: meta.color }}>
      {sym}
    </span>
  )
}

function fmtEval(cp: number | null, mate: number | null): string {
  if (mate !== null) return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`
  if (cp === null) return '—'
  return `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function resultColor(result: string, playerId: string, whiteId: string) {
  if (result === '1/2-1/2') return 'text-slate-400'
  const playerIsWhite = playerId === whiteId
  if (result === '1-0') return playerIsWhite ? 'text-green-400' : 'text-red-400'
  return playerIsWhite ? 'text-red-400' : 'text-green-400'
}

/* ── EvalMiniBar ────────────────────────────────────────────────────── */
function EvalMiniBar({ cp }: { cp: number | null }) {
  const val = cp ?? 0
  const clamped = Math.max(-500, Math.min(500, val))
  const whitePct = ((clamped + 500) / 1000) * 100
  return (
    <div className="w-3 h-full rounded overflow-hidden flex flex-col border border-slate-700">
      <div className="bg-slate-900" style={{ height: `${100 - whitePct}%` }} />
      <div className="bg-white" style={{ height: `${whitePct}%` }} />
    </div>
  )
}

/* ── AccuracyBar ────────────────────────────────────────────────────── */
function AccuracyBar({ accuracy }: { accuracy: number }) {
  const color = accuracy >= 90 ? '#22c55e' : accuracy >= 75 ? '#eab308' : '#ef4444'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">Accuracy</span>
        <span className="font-bold" style={{ color }}>{accuracy.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded bg-slate-700">
        <div className="h-full rounded transition-all" style={{ width: `${accuracy}%`, background: color }} />
      </div>
    </div>
  )
}

/* ── MoveList ───────────────────────────────────────────────────────── */
function MoveList({
  moves, currentIdx, onSelect,
}: {
  moves: Array<{ san: string; quality: string; symbol?: string }>
  currentIdx: number
  onSelect: (idx: number) => void
}) {
  const pairs: Array<[number, string, string, number, string, string]> = []
  for (let i = 0; i < moves.length; i += 2) {
    const wIdx = i
    const bIdx = i + 1
    pairs.push([
      wIdx, moves[i].san, moves[i].quality,
      bIdx, moves[i + 1]?.san ?? '', moves[i + 1]?.quality ?? '',
    ])
  }
  return (
    <div className="space-y-0.5 overflow-y-auto max-h-52 pr-1">
      {pairs.map(([wIdx, wSan, wQ, bIdx, bSan, bQ], pairNum) => (
        <div key={pairNum} className="flex gap-1 text-sm">
          <span className="text-slate-500 w-6 text-right shrink-0 pt-0.5">{pairNum + 1}.</span>
          <button onClick={() => onSelect(wIdx)}
            className={clsx('flex-1 text-left px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors',
              currentIdx === wIdx ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-slate-700 text-slate-200')}>
            <span className="font-mono">{wSan}</span>
            <QualityBadge quality={wQ} />
          </button>
          {bSan && (
            <button onClick={() => onSelect(bIdx)}
              className={clsx('flex-1 text-left px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors',
                currentIdx === bIdx ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-slate-700 text-slate-400')}>
              <span className="font-mono">{bSan}</span>
              <QualityBadge quality={bQ} />
            </button>
          )}
        </div>
      ))}
      {pairs.length === 0 && (
        <p className="text-slate-600 text-sm text-center py-4">No moves loaded</p>
      )}
    </div>
  )
}

/* ── ReplayView ─────────────────────────────────────────────────────── */
function ReplayView({
  game, moves, onClose,
}: {
  game: GameSummary | null
  moves: MoveData[]
  onClose: () => void
}) {
  const [idx, setIdx] = useState(-1)
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  const currentFen = idx < 0 ? START_FEN : (moves[idx]?.fen_after || START_FEN)
  const currentMove = idx >= 0 ? moves[idx] : null
  const evalCp = currentMove?.eval_cp ?? null

  const nav = useCallback((delta: number) => {
    setIdx(prev => Math.max(-1, Math.min(moves.length - 1, prev + delta)))
  }, [moves.length])

  useEffect(() => { setIdx(-1) }, [game])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') nav(-1)
      if (e.key === 'ArrowRight') nav(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nav])

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {game && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-300 font-medium">{game.opening_name || 'Unknown Opening'}</span>
              {game.opening_eco && (
                <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">{game.opening_eco}</span>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-0.5">
            Use ← → arrow keys or click moves to navigate
          </p>
        </div>
        <button onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 bg-slate-800 rounded transition-colors">
          ← Back to list
        </button>
      </div>

      <div className="flex gap-4">
        {/* Board + eval */}
        <div className="flex gap-2 items-stretch">
          <EvalMiniBar cp={evalCp} />
          <div className="w-64 shrink-0">
            <Chessboard
              position={currentFen}
              arePiecesDraggable={false}
              boardWidth={256}
              customBoardStyle={{ borderRadius: '8px' }}
              customDarkSquareStyle={{ backgroundColor: '#334155' }}
              customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
              customSquareStyles={currentMove ? {
                [currentMove.uci.slice(0, 2)]: { backgroundColor: 'rgba(245,158,11,0.3)' },
                [currentMove.uci.slice(2, 4)]: { backgroundColor: 'rgba(245,158,11,0.45)' },
              } : {}}
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Current move info */}
          <div className="glass rounded-lg p-3 space-y-2">
            {currentMove ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Move {Math.ceil((currentMove.move_number) / 1)}</span>
                    <span className="font-mono text-amber-300 font-bold text-sm">{currentMove.san}</span>
                    <QualityBadge quality={currentMove.quality} />
                  </div>
                  <span className="text-sm font-mono text-slate-300">
                    {fmtEval(currentMove.eval_cp, currentMove.eval_mate)}
                  </span>
                </div>
                {currentMove.quality && currentMove.quality !== 'best' && (
                  <p className="text-xs" style={{ color: QUALITY_META[currentMove.quality]?.color ?? '#94a3b8' }}>
                    {QUALITY_META[currentMove.quality]?.label}
                    {currentMove.eval_cp !== null && ` — eval: ${fmtEval(currentMove.eval_cp, currentMove.eval_mate)}`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500">Starting position</p>
            )}
          </div>

          {/* Move list */}
          <MoveList
            moves={moves.map(m => ({ san: m.san, quality: m.quality }))}
            currentIdx={idx}
            onSelect={setIdx}
          />

          {/* Navigation */}
          <div className="flex gap-1">
            {[
              { icon: ChevronsLeft,  action: () => setIdx(-1),              title: 'Start' },
              { icon: ChevronLeft,   action: () => nav(-1),                 title: 'Previous (←)' },
              { icon: ChevronRight,  action: () => nav(1),                  title: 'Next (→)' },
              { icon: ChevronsRight, action: () => setIdx(moves.length - 1), title: 'End' },
            ].map(({ icon: Icon, action, title }) => (
              <button key={title} onClick={action} title={title}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Move counter */}
          <p className="text-center text-xs text-slate-600">
            {idx < 0 ? 'Start' : `Move ${idx + 1} / ${moves.length}`}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── PGN Annotator ──────────────────────────────────────────────────── */
function PGNAnnotator({ onAnnotated }: {
  onAnnotated: (result: AnnotationResult, fakeMoves: MoveData[]) => void
}) {
  const [pgn, setPgn] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AnnotationResult | null>(null)

  const annotate = async () => {
    if (!pgn.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/history/annotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: pgn.trim(), depth: 10, time_per_move_ms: 500 }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data: AnnotationResult = await res.json()
      setResult(data)
      const chess = new Chess()
      const fakeMoves: MoveData[] = data.moves.map(m => {
        try {
          chess.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] || undefined })
        } catch { /* skip illegal */ }
        return {
          move_number: m.move_number,
          uci: m.uci,
          san: m.san,
          fen_after: chess.fen(),
          eval_cp: m.eval_cp,
          eval_mate: m.eval_mate,
          time_spent_ms: null,
          clock_remaining_ms: null,
          quality: m.quality,
        }
      })
      onAnnotated(data, fakeMoves)
    } catch (e: any) {
      setError(e.message ?? 'Annotation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <FileText className="w-4 h-4 text-amber-400" />
        <span className="font-medium text-slate-300">Annotate a PGN</span>
      </div>
      <textarea
        value={pgn}
        onChange={e => setPgn(e.target.value)}
        placeholder={'Paste a PGN here...\n\ne.g. 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6'}
        rows={5}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 resize-none focus:outline-none focus:border-amber-500"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {result && (
        <div className="glass rounded-lg p-3 space-y-2">
          <AccuracyBar accuracy={result.summary.accuracy} />
          <div className="grid grid-cols-4 gap-1 text-xs text-center">
            {(['brilliant','good','inaccuracy','mistake','blunder'] as const).map(q => (
              result.summary.counts[q] > 0 && (
                <div key={q} className={clsx('rounded p-1', QUALITY_META[q].bg)}>
                  <div className="font-bold" style={{ color: QUALITY_META[q].color }}>
                    {result.summary.counts[q]}
                  </div>
                  <div className="text-slate-500 text-xs">{QUALITY_META[q].symbol || q}</div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
      <button onClick={annotate} disabled={loading || !pgn.trim()}
        className="w-full py-2 bg-amber-500 disabled:opacity-50 text-slate-900 font-bold rounded-lg text-sm transition-colors hover:bg-amber-400">
        {loading ? 'Analysing…' : 'Annotate & Replay'}
      </button>
    </div>
  )
}

/* ── GameRow ────────────────────────────────────────────────────────── */
function GameRow({ game, playerId, onClick }: {
  game: GameSummary; playerId: string; onClick: () => void
}) {
  const playerIsWhite = playerId === game.white_id
  const opponentRating = playerIsWhite ? game.black_rating_before : game.white_rating_before
  const playerRatingBefore = playerIsWhite ? game.white_rating_before : game.black_rating_before
  const playerRatingAfter = playerIsWhite
    ? game.white_rating_after
    : game.black_rating_after
  const ratingDelta = playerRatingAfter != null ? playerRatingAfter - playerRatingBefore : null
  const rc = resultColor(game.result, playerId, game.white_id)

  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors space-y-1 border border-transparent hover:border-slate-600">
      <div className="flex items-center justify-between gap-2">
        <span className={clsx('font-bold text-sm', rc)}>{game.result}</span>
        <span className="text-xs text-slate-500">{game.opening_eco}</span>
        <span className="text-xs text-slate-500 ml-auto">{fmtDate(game.created_at)}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400 gap-2">
        <span className="truncate">{game.opening_name || 'Unknown Opening'}</span>
        <span className="shrink-0">vs {opponentRating} ELO</span>
        {ratingDelta !== null && (
          <span className={clsx('shrink-0 font-mono', ratingDelta >= 0 ? 'text-green-400' : 'text-red-400')}>
            {ratingDelta >= 0 ? '+' : ''}{ratingDelta}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Clock className="w-3 h-3" /><span>{game.time_category}</span>
        <span>·</span><span>{game.total_moves} moves</span>
        <span>·</span><span className="capitalize">{game.termination}</span>
      </div>
    </button>
  )
}

/* ── Main Component ─────────────────────────────────────────────────── */
export function GameHistoryPanel({ initialPlayerId }: { initialPlayerId?: string }) {
  const [playerId, setPlayerId] = useState('')
  const [inputVal, setInputVal] = useState(initialPlayerId ?? '')
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null)
  const [replayMoves, setReplayMoves] = useState<MoveData[]>([])
  const [movesLoading, setMovesLoading] = useState(false)

  const [view, setView] = useState<'list' | 'replay' | 'annotate'>('list')

  const fetchGames = useCallback(async (id: string) => {
    if (!id.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/history/games/${id.trim()}?limit=30`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: GameSummary[] = await res.json()
      setGames(data)
      setPlayerId(id.trim())
    } catch (e: any) {
      setError('Could not load games. Check the player ID.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-load from initialPlayerId or localStorage session
  useEffect(() => {
    const id = initialPlayerId || localStorage.getItem('chess_session_id') || ''
    if (id) {
      setInputVal(id)
      fetchGames(id)
    }
  }, [initialPlayerId, fetchGames])

  // Reload when a new game is saved (fires custom event from useChessGame)
  useEffect(() => {
    const handler = () => {
      const id = localStorage.getItem('chess_session_id')
      if (id) {
        setInputVal(id)
        fetchGames(id)
      }
    }
    window.addEventListener('chess_game_saved', handler)
    return () => window.removeEventListener('chess_game_saved', handler)
  }, [fetchGames])

  const openGame = useCallback(async (game: GameSummary) => {
    setSelectedGame(game)
    setMovesLoading(true)
    setView('replay')
    try {
      const res = await fetch(`${API}/api/history/games/${game.game_id}/moves`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setReplayMoves(data.moves ?? [])
    } catch {
      setReplayMoves([])
    } finally {
      setMovesLoading(false)
    }
  }, [])

  return (
    <div className="glass rounded-2xl p-5 space-y-4 w-full max-w-2xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-slate-100 text-lg">Game History</h2>
        </div>
        <div className="flex gap-1">
          {(['list', 'annotate'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx('text-xs px-3 py-1.5 rounded-lg transition-colors capitalize',
                view === v ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700')}>
              {v === 'list' ? 'My Games' : 'Annotate PGN'}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="space-y-3">
          {/* Player ID search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchGames(inputVal)}
                placeholder="Enter player ID (UUID)…"
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button onClick={() => fetchGames(inputVal)} disabled={loading}
              className="px-4 py-2 bg-amber-500 text-slate-900 font-bold rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 transition-colors">
              {loading ? '…' : 'Load'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Games list */}
          {games.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">{games.length} game{games.length !== 1 ? 's' : ''} found</p>
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {games.map(g => (
                  <GameRow key={g.game_id} game={g} playerId={playerId} onClick={() => openGame(g)} />
                ))}
              </div>
            </div>
          ) : playerId ? (
            <div className="text-center py-12 space-y-2">
              <Award className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-slate-500 text-sm">No games found for this player.</p>
              <p className="text-slate-600 text-xs">Play some games to build your history!</p>
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="space-y-1">
                <p className="text-slate-400 text-sm">Enter your player ID above to view game history.</p>
                <p className="text-slate-600 text-xs">
                  No account? Use the{' '}
                  <button onClick={() => setView('annotate')}
                    className="text-amber-400 hover:underline">Annotate PGN</button>{' '}
                  tab to analyse any game.
                </p>
              </div>
              <div className="glass rounded-lg p-3 text-left space-y-2">
                <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
                  <Star className="w-3 h-3" /> Tip
                </p>
                <p className="text-xs text-slate-500">
                  Your player ID is returned when you register via{' '}
                  <code className="text-slate-400 bg-slate-800 px-1 rounded">POST /api/auth/register</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REPLAY VIEW ── */}
      {view === 'replay' && (
        <div className="space-y-3">
          {movesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-slate-500 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 animate-pulse text-amber-400" />
                Loading moves…
              </div>
            </div>
          ) : (
            <ReplayView
              game={selectedGame}
              moves={replayMoves}
              onClose={() => setView('list')}
            />
          )}
        </div>
      )}

      {/* ── ANNOTATE VIEW ── */}
      {view === 'annotate' && (
        <PGNAnnotator
          onAnnotated={(_result, fakeMoves) => {
            setReplayMoves(fakeMoves)
            setSelectedGame(null)
            setView('replay')
          }}
        />
      )}
    </div>
  )
}
