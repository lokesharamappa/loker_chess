import { useState, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'

const API = 'http://localhost:8000'

export interface AIMoveInfo {
  move_uci: string
  move_san: string
  score_str: string
  depth: number
  nodes: number
  time_ms: number
  source: string
  pv: string[]
  annotation: string
}

export interface AnalysisLine {
  rank: number
  move: string
  score_cp?: number
  score_mate?: number
  depth: number
  pv: string[]
  annotation: string
}

export interface Analysis {
  fen: string
  phase: string
  lines: AnalysisLine[]
  book_moves: { move: string; frequency: number }[]
  tablebase_wdl?: string
  static_eval_cp: number
}

export type Strength =
  | 'beginner' | 'novice' | 'intermediate' | 'advanced'
  | 'expert' | 'master' | 'grandmaster' | 'super_gm'

export function useChessGame(playerColor: 'white' | 'black', strength: Strength) {
  const [game, setGame] = useState(new Chess())
  const [fen, setFen] = useState(new Chess().fen())
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [evalCp, setEvalCp] = useState(0)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [aiInfo, setAiInfo] = useState<AIMoveInfo | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [gameOver, setGameOver] = useState<string | null>(null)
  const [highlightSquares, setHighlightSquares] = useState<Record<string, React.CSSProperties>>({})
  const abortRef = useRef<AbortController | null>(null)

  const isPlayerTurn = useCallback(
    (g: Chess) => (g.turn() === 'w' ? 'white' : 'black') === playerColor && !g.isGameOver(),
    [playerColor]
  )

  const fetchAnalysis = useCallback(async (currentFen: string) => {
    try {
      const res = await fetch(`${API}/api/games/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: currentFen, depth: 16, time_limit_ms: 2500, multi_pv: 3 }),
      })
      if (!res.ok) return
      const data: Analysis = await res.json()
      setAnalysis(data)
      setEvalCp(data.static_eval_cp ?? 0)
    } catch { /* silently fail */ }
  }, [])

  const fetchAIMove = useCallback(
    async (currentFen: string, currentGame: Chess) => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setIsThinking(true)
      try {
        const res = await fetch(`${API}/api/games/ai-move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fen: currentFen, strength, time_limit_ms: 5000 }),
          signal: abortRef.current.signal,
        })
        if (!res.ok) return
        const data: AIMoveInfo = await res.json()
        setAiInfo(data)
        const newGame = new Chess(currentFen)
        newGame.move({ from: data.move_uci.slice(0, 2), to: data.move_uci.slice(2, 4),
                       promotion: data.move_uci[4] || undefined })
        setGame(newGame)
        setFen(newGame.fen())
        setMoveHistory(newGame.history())
        setHighlightSquares({
          [data.move_uci.slice(0, 2)]: { backgroundColor: 'rgba(245,158,11,0.3)' },
          [data.move_uci.slice(2, 4)]: { backgroundColor: 'rgba(245,158,11,0.45)' },
        })
        if (newGame.isGameOver()) setGameOver(getGameOverReason(newGame))
        fetchAnalysis(newGame.fen())
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error('AI error', e)
      } finally {
        setIsThinking(false)
      }
    },
    [strength, fetchAnalysis]
  )

  const makePlayerMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      if (isThinking) return false
      try {
        const newGame = new Chess(game.fen())
        const move = newGame.move({ from, to, promotion: promotion || undefined })
        if (!move) return false
        setGame(newGame)
        setFen(newGame.fen())
        setMoveHistory(newGame.history())
        setHighlightSquares({
          [from]: { backgroundColor: 'rgba(99,102,241,0.3)' },
          [to]:   { backgroundColor: 'rgba(99,102,241,0.45)' },
        })
        if (newGame.isGameOver()) {
          setGameOver(getGameOverReason(newGame))
          fetchAnalysis(newGame.fen())
          return true
        }
        fetchAnalysis(newGame.fen())
        if (!isPlayerTurn(newGame)) {
          fetchAIMove(newGame.fen(), newGame)
        }
        return true
      } catch { return false }
    },
    [game, isThinking, isPlayerTurn, fetchAIMove, fetchAnalysis]
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    const g = new Chess()
    setGame(g)
    setFen(g.fen())
    setMoveHistory([])
    setGameOver(null)
    setAiInfo(null)
    setAnalysis(null)
    setEvalCp(0)
    setHighlightSquares({})
    setIsThinking(false)
    if (playerColor === 'black') fetchAIMove(g.fen(), g)
  }, [playerColor, fetchAIMove])

  return {
    game, fen, moveHistory, evalCp, analysis, aiInfo,
    isThinking, gameOver, highlightSquares,
    makePlayerMove, reset, fetchAnalysis, isPlayerTurn,
  }
}

function getGameOverReason(g: Chess): string {
  if (g.isCheckmate()) return `Checkmate — ${g.turn() === 'w' ? 'Black' : 'White'} wins`
  if (g.isStalemate()) return 'Stalemate — Draw'
  if (g.isThreefoldRepetition()) return 'Threefold Repetition — Draw'
  if (g.isInsufficientMaterial()) return 'Insufficient Material — Draw'
  if (g.isDraw()) return 'Draw by 50-move rule'
  return 'Game Over'
}
