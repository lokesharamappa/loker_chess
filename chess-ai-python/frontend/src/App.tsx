import React, { useState, useEffect, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import {
  Brain, BarChart2, Settings, ChevronLeft, ChevronRight,
  RotateCcw, Flag, Handshake, Zap, BookOpen, Shield,
  Puzzle, History, TrendingUp, Clock, Eye, LogIn, LogOut, User, Trophy,
} from 'lucide-react'
import clsx from 'clsx'
import { EvalGraph } from './components/EvalGraph'
import { PuzzlePanel } from './components/PuzzlePanel'
import { OpeningExplorer } from './components/OpeningExplorer'
import { GameHistoryPanel } from './components/GameHistoryPanel'
import { SpectatorView } from './components/SpectatorView'
import { AuthModal } from './components/AuthModal'
import { TournamentPanel } from './components/TournamentPanel'
import { useChessGame } from './hooks/useChessGame'
import { useAuth } from './hooks/useAuth'
import type { Strength } from './hooks/useChessGame'

type Tab = 'play' | 'puzzles' | 'openings' | 'history' | 'spectate' | 'tournament'

const STRENGTHS: { value: Strength; label: string; elo: number; color: string }[] = [
  { value: 'beginner',     label: 'Beginner',     elo: 800,  color: '#22c55e' },
  { value: 'novice',       label: 'Novice',       elo: 1200, color: '#84cc16' },
  { value: 'intermediate', label: 'Intermediate', elo: 1600, color: '#eab308' },
  { value: 'advanced',     label: 'Advanced',     elo: 2000, color: '#f97316' },
  { value: 'expert',       label: 'Expert',       elo: 2400, color: '#ef4444' },
  { value: 'master',       label: 'Master',       elo: 2600, color: '#a855f7' },
  { value: 'grandmaster',  label: 'Grandmaster',  elo: 2800, color: '#06b6d4' },
  { value: 'super_gm',     label: 'Super GM',     elo: 3200, color: '#f59e0b' },
]

function fmtCp(cp?: number, mate?: number): string {
  if (mate !== undefined) return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`
  if (cp === undefined) return '0.00'
  return `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}`
}

function EvalBar({ cp, flipped }: { cp: number; flipped: boolean }) {
  const clamped = Math.max(-500, Math.min(500, cp))
  const pct = ((clamped + 500) / 1000) * 100
  const whitePct = flipped ? 100 - pct : pct
  return (
    <div className="w-4 h-full rounded overflow-hidden flex flex-col border border-slate-600">
      <div className="bg-slate-900 transition-all duration-300" style={{ height: `${100 - whitePct}%` }} />
      <div className="bg-white transition-all duration-300" style={{ height: `${whitePct}%` }} />
    </div>
  )
}

function ChessClock({ ms, active }: { ms: number; active: boolean }) {
  const secs = Math.ceil(ms / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xl font-bold transition-all',
      active ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300',
      secs < 30 && active ? 'animate-pulse text-red-600' : ''
    )}>
      <Clock className="w-4 h-4" />
      {m}:{s.toString().padStart(2, '0')}
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('play')
  const [strength, setStrength] = useState<Strength>('grandmaster')
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const [rightTab, setRightTab] = useState<'analysis' | 'moves' | 'settings'>('analysis')
  const [puzzleRating, setPuzzleRating] = useState(1200)
  const [evalHistory, setEvalHistory] = useState<(number | null)[]>([])
  const [showAuth, setShowAuth] = useState(false)
  const [thinkingMs, setThinkingMs] = useState(2000)
  const [promotionSquare, setPromotionSquare] = useState<string | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null)
  const moveListRef = useRef<HTMLDivElement>(null)

  const { user, login, register, logout, refreshRating } = useAuth()

  const {
    game, fen, moveHistory, evalCp, analysis, aiInfo,
    isThinking, gameOver, highlightSquares, makePlayerMove, reset,
  } = useChessGame(playerColor, strength, thinkingMs)

  const selectedStrength = STRENGTHS.find(s => s.value === strength)!
  const isWhiteTurn = game.turn() === 'w'
  const pairMoves: [string, string?][] = []
  for (let i = 0; i < moveHistory.length; i += 2)
    pairMoves.push([moveHistory[i], moveHistory[i + 1]])

  useEffect(() => {
    setEvalHistory(prev => [...prev, evalCp ?? null])
  }, [evalCp])

  useEffect(() => {
    if (moveListRef.current)
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight
  }, [moveHistory])

  function onDrop(src: string, tgt: string, piece: string): boolean {
    const isPawn = piece[1]?.toUpperCase() === 'P'
    const isBackRank = tgt[1] === '8' || tgt[1] === '1'
    if (isPawn && isBackRank) {
      setPendingPromotion({ from: src, to: tgt })
      setPromotionSquare(tgt)
      return false
    }
    return makePlayerMove(src, tgt)
  }

  function onPromotionPieceSelect(piece?: string): boolean {
    if (!pendingPromotion) { setPromotionSquare(null); return false }
    const promoLetter = piece ? piece[1]?.toLowerCase() : 'q'
    const result = makePlayerMove(pendingPromotion.from, pendingPromotion.to, promoLetter)
    setPendingPromotion(null)
    setPromotionSquare(null)
    return result
  }

  function handleReset() {
    reset()
    setEvalHistory([])
  }

  function flipBoard() {
    const next = playerColor === 'white' ? 'black' : 'white'
    setPlayerColor(next)
    setBoardOrientation(next)
    reset()
    setEvalHistory([])
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'play',     label: 'Play',     icon: <Shield className="w-4 h-4" /> },
    { id: 'puzzles',  label: 'Puzzles',  icon: <Puzzle className="w-4 h-4" /> },
    { id: 'openings', label: 'Openings', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'history',  label: 'History',  icon: <History className="w-4 h-4" /> },
    { id: 'spectate',    label: 'Spectate',    icon: <Eye className="w-4 h-4" /> },
    { id: 'tournament', label: 'Tournament', icon: <Trophy className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="glass border-b border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">♛</span>
          <div>
            <h1 className="text-lg font-bold text-amber-400">Chess AI Pro</h1>
            <p className="text-xs text-slate-400">FIDE Level · Multi-Agent AI</p>
          </div>
        </div>
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                tab === t.id
                  ? 'bg-amber-500 text-slate-900'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: selectedStrength.color + '22', color: selectedStrength.color,
                     border: `1px solid ${selectedStrength.color}44` }}>
            <Brain className="w-3 h-3" />{selectedStrength.label} ({selectedStrength.elo})
          </div>
          {isThinking && (
            <span className="flex items-center gap-1 text-xs text-amber-400 animate-pulse">
              <Zap className="w-3 h-3" />Thinking...
            </span>
          )}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="text-right">
                <p className="text-xs font-medium text-slate-200 leading-tight">{user.display_name}</p>
                <p className="text-xs text-slate-500">{Math.round(user.rating)} ELO</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <User className="w-4 h-4 text-amber-400" />
              </div>
              <button onClick={logout} title="Sign out"
                className="text-slate-500 hover:text-slate-300 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-medium transition-colors">
              <LogIn className="w-3.5 h-3.5" />Sign In
            </button>
          )}
        </div>
      </header>

      {showAuth && (
        <AuthModal
          onLogin={login}
          onRegister={register}
          onClose={() => setShowAuth(false)}
        />
      )}

      {/* ── PLAY TAB ─────────────────────────────────────────────── */}
      {tab === 'play' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Eval bar */}
          <div className="w-10 flex flex-col items-center py-4 border-r border-slate-800 shrink-0">
            <div className="flex-1 w-full px-2">
              <EvalBar cp={evalCp} flipped={boardOrientation === 'black'} />
            </div>
            <span className="text-xs text-slate-400 font-mono mt-1">{fmtCp(evalCp)}</span>
          </div>

          {/* Board column */}
          <div className="flex flex-col items-center justify-center flex-1 px-4 py-4 gap-3">
            <div className="flex items-center justify-between w-full max-w-md">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-slate-500" />
                <span>{boardOrientation === 'white' ? 'Black (AI)' : 'White (You)'}</span>
              </div>
              <ChessClock ms={300_000} active={boardOrientation === 'white' ? !isWhiteTurn : isWhiteTurn} />
            </div>

            {gameOver && (
              <div className="w-full max-w-md bg-amber-500 text-slate-900 text-center py-2 rounded-lg font-bold text-sm">
                {gameOver}
              </div>
            )}

            <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-700">
              <Chessboard
                position={fen}
                onPieceDrop={onDrop}
                onPromotionPieceSelect={onPromotionPieceSelect}
                promotionToSquare={promotionSquare as any}
                boardOrientation={boardOrientation}
                customSquareStyles={highlightSquares}
                boardWidth={480}
                customBoardStyle={{ borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}
                customDarkSquareStyle={{ backgroundColor: '#1e3a5f' }}
                customLightSquareStyle={{ backgroundColor: '#e8d5b7' }}
                areArrowsAllowed
              />
            </div>

            <div className="flex items-center justify-between w-full max-w-md">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>{boardOrientation === 'white' ? 'White (You)' : 'Black (AI)'}</span>
              </div>
              <ChessClock ms={300_000} active={boardOrientation === 'white' ? isWhiteTurn : !isWhiteTurn} />
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleReset}
                className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                <RotateCcw className="w-4 h-4" />New Game
              </button>
              <button onClick={flipBoard}
                className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                <ChevronLeft className="w-3 h-3" /><ChevronRight className="w-3 h-3" />Flip
              </button>
              <button className="flex items-center gap-1 px-3 py-2 bg-red-900 hover:bg-red-800 rounded-lg text-sm">
                <Flag className="w-4 h-4" />Resign
              </button>
              <button className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                <Handshake className="w-4 h-4" />Draw
              </button>
            </div>

            {/* Eval graph */}
            <div className="w-full max-w-md">
              <EvalGraph evals={evalHistory} width={480} height={72} />
            </div>
          </div>

          {/* Right panel */}
          <div className="w-80 glass border-l border-slate-700 flex flex-col">
            <div className="flex border-b border-slate-700 shrink-0">
              {(['analysis', 'moves', 'settings'] as const).map(t => (
                <button key={t} onClick={() => setRightTab(t)}
                  className={clsx(
                    'flex-1 py-3 text-xs font-medium capitalize transition-colors',
                    rightTab === t ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-200'
                  )}>
                  {t === 'analysis' && <BarChart2 className="w-3 h-3 inline mr-1" />}
                  {t === 'moves'    && <BookOpen  className="w-3 h-3 inline mr-1" />}
                  {t === 'settings' && <Settings  className="w-3 h-3 inline mr-1" />}
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {/* Analysis */}
              {rightTab === 'analysis' && (
                <div className="space-y-3">
                  {analysis && (
                    <>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Phase: <span className="text-amber-400 font-medium capitalize">{analysis.phase}</span></span>
                        {analysis.tablebase_wdl && <span className="text-purple-400">TB: {analysis.tablebase_wdl}</span>}
                      </div>
                      {analysis.lines.map((line: any) => (
                        <div key={line.rank} className="bg-slate-800 rounded-lg p-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-white">{line.move}</span>
                            <span className={clsx('font-mono text-sm font-bold',
                              line.score_cp !== undefined
                                ? line.score_cp > 0 ? 'text-green-400' : line.score_cp < 0 ? 'text-red-400' : 'text-slate-400'
                                : 'text-purple-400')}>
                              {fmtCp(line.score_cp, line.score_mate)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono truncate">{(line.pv as string[]).slice(0, 5).join(' ')}</p>
                          <p className="text-xs text-slate-500">depth {line.depth}</p>
                        </div>
                      ))}
                      {analysis.book_moves.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                            <BookOpen className="w-3 h-3 inline mr-1" />Book Moves
                          </p>
                          {(analysis.book_moves as any[]).slice(0, 5).map((bm: any, i: number) => (
                            <div key={i} className="flex items-center justify-between bg-slate-800 rounded px-2 py-1">
                              <span className="font-mono text-sm text-amber-300">{bm.move}</span>
                              <span className="text-xs text-slate-400">{bm.frequency}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {aiInfo && (
                    <div className="bg-slate-800 rounded-lg p-2 space-y-1 border border-amber-500/20">
                      <p className="text-xs text-amber-400 font-medium">Last AI Move</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Move: <strong className="text-white">{aiInfo.move_san}</strong></span>
                        <span className="text-amber-300 font-bold">{aiInfo.score_str}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>d{aiInfo.depth}</span>
                        <span>{aiInfo.nodes.toLocaleString()} nodes</span>
                        <span>{aiInfo.time_ms.toFixed(0)}ms</span>
                      </div>
                      <p className="text-xs text-purple-400 capitalize">{aiInfo.source}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Moves */}
              {rightTab === 'moves' && (
                <div ref={moveListRef} className="space-y-0.5">
                  {pairMoves.length === 0 && (
                    <p className="text-slate-500 text-sm text-center mt-8">No moves yet</p>
                  )}
                  {pairMoves.map(([w, b], i) => (
                    <div key={i} className="flex gap-2 text-sm rounded px-2 py-1 hover:bg-slate-800">
                      <span className="text-slate-500 w-6 text-right shrink-0">{i + 1}.</span>
                      <span className="font-mono text-slate-200 flex-1">{w}</span>
                      <span className="font-mono text-slate-400 flex-1">{b ?? ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Settings */}
              {rightTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">AI Strength</p>
                    <div className="space-y-1">
                      {STRENGTHS.map(opt => (
                        <button key={opt.value} onClick={() => setStrength(opt.value)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all bg-slate-800 hover:bg-slate-700"
                          style={strength === opt.value ? {
                            backgroundColor: opt.color + '22', color: opt.color,
                            border: `1px solid ${opt.color}66`,
                          } : {}}>
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs opacity-70">{opt.elo} ELO</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Play As</p>
                    <div className="flex gap-2">
                      {(['white', 'black'] as const).map(c => (
                        <button key={c} onClick={() => { setPlayerColor(c); setBoardOrientation(c); handleReset() }}
                          className={clsx('flex-1 py-2 rounded-lg text-sm font-medium capitalize',
                            playerColor === c ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>
                          {c === 'white' ? '♔ White' : '♚ Black'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Response Speed</p>
                    <div className="flex gap-1">
                      {([{ms:1000,label:'Fast',sub:'~1s'},{ms:2000,label:'Balanced',sub:'~2s'},{ms:4000,label:'Deep',sub:'~4s'}] as const).map(opt => (
                        <button key={opt.ms} onClick={() => setThinkingMs(opt.ms)}
                          className={clsx('flex-1 flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-all border',
                            thinkingMs === opt.ms
                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200')}>
                          <span>{opt.label}</span>
                          <span className="text-slate-500 text-[10px]">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5">Applied at next move. Depth is capped by strength level.</p>
                  </div>
                  <div className="glass rounded-lg p-3 space-y-1">
                    <p className="text-xs text-amber-400 font-medium">Multi-Agent System</p>
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex items-center gap-2"><BookOpen className="w-3 h-3 text-green-400" />Opening Agent — Polyglot book</div>
                      <div className="flex items-center gap-2"><Brain className="w-3 h-3 text-blue-400" />Search Agent — Alpha-Beta PVS</div>
                      <div className="flex items-center gap-2"><TrendingUp className="w-3 h-3 text-purple-400" />Endgame Agent — Syzygy TB</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PUZZLES TAB ──────────────────────────────────────────── */}
      {tab === 'puzzles' && (
        <div className="flex-1 flex items-start justify-center py-8 px-4">
          <div className="w-full max-w-md">
            <PuzzlePanel
              token={user?.access_token ?? null}
              playerPuzzleRating={user ? user.rating : puzzleRating}
              onRatingChange={(r) => { setPuzzleRating(r); if (user) refreshRating(r) }}
            />
          </div>
        </div>
      )}

      {/* ── OPENINGS TAB ─────────────────────────────────────────── */}
      {tab === 'openings' && (
        <div className="flex-1 flex items-start justify-center py-8 px-4">
          <div className="w-full max-w-md">
            <OpeningExplorer />
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <GameHistoryPanel initialPlayerId={user?.player_id} />
        </div>
      )}

      {/* ── SPECTATE TAB ────────────────────────────────────────── */}
      {tab === 'spectate' && (
        <div className="flex-1 overflow-y-auto">
          <SpectatorView />
        </div>
      )}

      {/* ── TOURNAMENT TAB ──────────────────────────────────────── */}
      {tab === 'tournament' && (
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <TournamentPanel user={user} />
        </div>
      )}
    </div>
  )
}
