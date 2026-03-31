import React, { useState, useEffect, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Brain, CheckCircle, XCircle, ChevronRight, Tag, Zap } from 'lucide-react'
import clsx from 'clsx'

const API = 'http://localhost:8000'

interface Puzzle {
  puzzle_id: string
  fen: string
  side_to_move: string
  rating: number
  themes: string[]
  opening_eco?: string
  opening_name?: string
}

interface SolveResult {
  correct: boolean
  solution: string[]
  player_rating_before: number
  player_rating_after: number
  puzzle_rating: number
  delta: number
  themes: string[]
  explanation: string
}

interface Props {
  token: string | null
  playerPuzzleRating: number
  onRatingChange: (newRating: number) => void
}

const DEMO_PUZZLES: Puzzle[] = [
  { puzzle_id: 'demo1', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', side_to_move: 'white', rating: 1200, themes: ['checkmate', 'scholar'], opening_eco: 'C50', opening_name: 'Italian Game' },
  { puzzle_id: 'demo2', fen: '1k1r4/pp1b1R2/3p4/2pP2B1/2P2P2/r7/PP1R4/K7 b - - 0 1', side_to_move: 'black', rating: 1500, themes: ['fork', 'tactics'] },
  { puzzle_id: 'demo3', fen: '8/8/4k3/4P3/4K3/8/8/8 w - - 0 1', side_to_move: 'white', rating: 800, themes: ['endgame', 'pawn'] },
]

export function PuzzlePanel({ token, playerPuzzleRating, onRatingChange }: Props) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [game, setGame] = useState<Chess | null>(null)
  const [movesPlayed, setMovesPlayed] = useState<string[]>([])
  const [result, setResult] = useState<SolveResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState<Record<string, React.CSSProperties>>({})
  const [demoIdx, setDemoIdx] = useState(0)

  const loadPuzzle = useCallback(async () => {
    setLoading(true)
    setResult(null)
    setMovesPlayed([])
    setHighlight({})
    if (!token) {
      const p = DEMO_PUZZLES[demoIdx % DEMO_PUZZLES.length]
      setDemoIdx(i => i + 1)
      setPuzzle(p)
      setGame(new Chess(p.fen))
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${API}/api/puzzles/next`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const p: Puzzle = await res.json()
      setPuzzle(p)
      setGame(new Chess(p.fen))
    } catch {
      const p = DEMO_PUZZLES[demoIdx % DEMO_PUZZLES.length]
      setDemoIdx(i => i + 1)
      setPuzzle(p)
      setGame(new Chess(p.fen))
    } finally {
      setLoading(false)
    }
  }, [token, demoIdx])

  useEffect(() => { loadPuzzle() }, [])

  const onDrop = useCallback((from: string, to: string) => {
    if (!game || !puzzle || result) return false
    const move = game.move({ from, to, promotion: 'q' })
    if (!move) return false
    const newMoves = [...movesPlayed, move.lan || `${from}${to}`]
    setMovesPlayed(newMoves)
    setHighlight({
      [from]: { backgroundColor: 'rgba(99,102,241,0.3)' },
      [to]:   { backgroundColor: 'rgba(99,102,241,0.4)' },
    })
    setGame(new Chess(game.fen()))
    submitSolution(newMoves)
    return true
  }, [game, puzzle, result, movesPlayed])

  const submitSolution = async (moves: string[]) => {
    if (!puzzle) return
    if (!token) {
      const correct = moves.length > 0
      const fakeResult: SolveResult = {
        correct, solution: ['h5f7'],
        player_rating_before: playerPuzzleRating,
        player_rating_after: playerPuzzleRating + (correct ? 15 : -10),
        puzzle_rating: puzzle.rating,
        delta: correct ? 15 : -10,
        themes: puzzle.themes,
        explanation: correct
          ? `Correct! Theme: ${puzzle.themes.join(', ')}`
          : `Try again — Theme: ${puzzle.themes.join(', ')}`,
      }
      setResult(fakeResult)
      if (correct) onRatingChange(fakeResult.player_rating_after)
      return
    }
    try {
      const res = await fetch(`${API}/api/puzzles/${puzzle.puzzle_id}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ moves_played: moves, time_spent_ms: 0 }),
      })
      if (!res.ok) return
      const r: SolveResult = await res.json()
      setResult(r)
      onRatingChange(r.player_rating_after)
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-lg text-white">Tactics Trainer</h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Puzzle Rating:</span>
          <span className="font-bold text-amber-400">{playerPuzzleRating}</span>
        </div>
      </div>

      {puzzle && (
        <div className="glass rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {puzzle.side_to_move === 'white' ? '♔ White to move' : '♚ Black to move'}
            </span>
            <span className="text-amber-400 font-medium">Rating: {puzzle.rating}</span>
          </div>
          {puzzle.opening_name && (
            <p className="text-xs text-slate-500">{puzzle.opening_eco} — {puzzle.opening_name}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {puzzle.themes.map(t => (
              <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 rounded-full text-xs text-slate-300">
                <Tag className="w-2.5 h-2.5" />{t}
              </span>
            ))}
          </div>
        </div>
      )}

      {game && puzzle && (
        <div className="rounded-xl overflow-hidden border border-slate-700">
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardOrientation={puzzle.side_to_move as 'white' | 'black'}
            boardWidth={340}
            customSquareStyles={highlight}
            customDarkSquareStyle={{ backgroundColor: '#1e3a5f' }}
            customLightSquareStyle={{ backgroundColor: '#e8d5b7' }}
            arePiecesDraggable={!result}
          />
        </div>
      )}

      {result && (
        <div className={clsx(
          'rounded-xl p-3 space-y-2 border',
          result.correct
            ? 'bg-green-900/30 border-green-600/40'
            : 'bg-red-900/30 border-red-600/40'
        )}>
          <div className="flex items-center gap-2">
            {result.correct
              ? <CheckCircle className="w-5 h-5 text-green-400" />
              : <XCircle className="w-5 h-5 text-red-400" />}
            <span className={clsx('font-bold', result.correct ? 'text-green-400' : 'text-red-400')}>
              {result.correct ? 'Correct!' : 'Incorrect'}
            </span>
            <span className={clsx(
              'ml-auto text-sm font-bold',
              result.delta > 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {result.delta > 0 ? '+' : ''}{result.delta}
            </span>
          </div>
          <p className="text-xs text-slate-400">{result.explanation}</p>
          <p className="text-xs text-slate-500 font-mono">
            Solution: {result.solution.join(' ')}
          </p>
        </div>
      )}

      <button
        onClick={loadPuzzle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-slate-900 font-bold rounded-xl transition-colors text-sm"
      >
        {loading ? <Zap className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
        {loading ? 'Loading...' : result ? 'Next Puzzle' : 'Skip Puzzle'}
      </button>
    </div>
  )
}
