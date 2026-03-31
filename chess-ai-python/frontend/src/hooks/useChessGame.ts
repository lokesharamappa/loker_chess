import { useState, useCallback, useRef, useMemo } from 'react'
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

export interface MoveReviewItem {
  move_number: number
  uci: string
  san: string
  eval_cp: number | null
  best_move_uci: string | null
  best_eval_cp: number | null
  delta_cp: number | null
  quality: string
  quality_symbol: string
  comment: string
  side: 'white' | 'black'
}

export interface PlayerStats {
  accuracy: number
  brilliant: number
  good: number
  best: number
  interesting: number
  inaccuracy: number
  mistake: number
  blunder: number
}

export interface GameReview {
  moves: MoveReviewItem[]
  white_stats: PlayerStats
  black_stats: PlayerStats
  total_moves: number
}

export type Strength =
  | 'beginner' | 'novice' | 'intermediate' | 'advanced'
  | 'expert' | 'master' | 'grandmaster' | 'super_gm'

export function useChessGame(playerColor: 'white' | 'black', strength: Strength, thinkingMs = 2000) {
  const [game, setGame] = useState(new Chess())
  const [fen, setFen] = useState(new Chess().fen())
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [evalCp, setEvalCp] = useState(0)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [aiInfo, setAiInfo] = useState<AIMoveInfo | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [gameOver, setGameOver] = useState<string | null>(null)
  const [highlightSquares, setHighlightSquares] = useState<Record<string, React.CSSProperties>>({})
  const [moveHistoryUCI, setMoveHistoryUCI] = useState<string[]>([])
  const [reviewData, setReviewData] = useState<GameReview | null>(null)
  const [isFetchingReview, setIsFetchingReview] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const moveHistoryUCIRef = useRef<string[]>([])
  const gameSavedRef = useRef(false)
  const undoStackRef = useRef<string[][]>([])
  const [coachMove, setCoachMove] = useState<string | null>(null)
  const [isFetchingCoach, setIsFetchingCoach] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [currentOpening, setCurrentOpening] = useState<{ eco: string; name: string } | null>(null)

  const isPlayerTurn = useCallback(
    (g: Chess) => (g.turn() === 'w' ? 'white' : 'black') === playerColor && !g.isGameOver(),
    [playerColor]
  )

  const fetchOpening = useCallback(async (moves: string[]) => {
    if (moves.length === 0 || moves.length > 22) return
    try {
      const res = await fetch(`${API}/api/openings/classify-moves?moves=${moves.join('+')}`, { signal: AbortSignal.timeout(2000) })
      if (!res.ok) return
      const data = await res.json()
      if (data.name && data.eco !== 'A00') setCurrentOpening({ eco: data.eco, name: data.name })
    } catch { /* silently fail */ }
  }, [])

  const fetchAnalysis = useCallback(async (currentFen: string) => {
    try {
      const res = await fetch(`${API}/api/games/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: currentFen, depth: 16, time_limit_ms: Math.min(thinkingMs, 2500), multi_pv: 3 }),
      })
      if (!res.ok) return
      const data: Analysis = await res.json()
      setAnalysis(data)
      setEvalCp(data.static_eval_cp ?? 0)
    } catch { /* silently fail */ }
  }, [])

  const saveGame = useCallback(async (result: string, termination: string, timeControl = '5+0', timeCategory = 'blitz') => {
    if (gameSavedRef.current || moveHistoryUCIRef.current.length < 2) return
    gameSavedRef.current = true
    const sessionId = localStorage.getItem('chess_session_id') || undefined
    try {
      const res = await fetch(`${API}/api/history/quick-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moves_uci: moveHistoryUCIRef.current,
          result,
          termination,
          player_color: playerColor,
          time_control: timeControl,
          time_category: timeCategory,
          session_id: sessionId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('chess_session_id', data.session_id)
        window.dispatchEvent(new CustomEvent('chess_game_saved', { detail: data }))
      }
    } catch (e) {
      console.error('Save game error', e)
    }
  }, [playerColor])

  const fetchAIMove = useCallback(
    async (currentFen: string, _currentGame?: Chess) => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setIsThinking(true)
      try {
        const res = await fetch(`${API}/api/games/ai-move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fen: currentFen, strength, time_limit_ms: thinkingMs }),
          signal: abortRef.current.signal,
        })
        if (!res.ok) return
        const data: AIMoveInfo = await res.json()
        setAiInfo(data)
        // Rebuild full game from UCI ref to preserve complete history
        const newGame = new Chess()
        for (const uci of moveHistoryUCIRef.current) {
          newGame.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined })
        }
        newGame.move({ from: data.move_uci.slice(0, 2), to: data.move_uci.slice(2, 4),
                       promotion: data.move_uci[4] || undefined })
        moveHistoryUCIRef.current = [...moveHistoryUCIRef.current, data.move_uci]
        setGame(newGame)
        setFen(newGame.fen())
        setMoveHistory(newGame.history())
        setMoveHistoryUCI([...moveHistoryUCIRef.current])
        setHighlightSquares({
          [data.move_uci.slice(0, 2)]: { backgroundColor: 'rgba(245,158,11,0.3)' },
          [data.move_uci.slice(2, 4)]: { backgroundColor: 'rgba(245,158,11,0.45)' },
        })
        if (newGame.isGameOver()) setGameOver(getGameOverReason(newGame))
        fetchOpening(moveHistoryUCIRef.current)
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
        // Rebuild from full UCI history to preserve complete move list
        const newGame = new Chess()
        for (const uci of moveHistoryUCIRef.current) {
          newGame.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined })
        }
        const move = newGame.move({ from, to, promotion: promotion || undefined })
        if (!move) return false
        const moveUci = move.from + move.to + (move.promotion || '')
        undoStackRef.current = []  // new move invalidates redo history
        setCanRedo(false)
        setCoachMove(null)
        moveHistoryUCIRef.current = [...moveHistoryUCIRef.current, moveUci]
        setGame(newGame)
        setFen(newGame.fen())
        setMoveHistory(newGame.history())
        setMoveHistoryUCI([...moveHistoryUCIRef.current])
        fetchOpening(moveHistoryUCIRef.current)
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
          fetchAIMove(newGame.fen())
        }
        return true
      } catch { return false }
    },
    [isThinking, isPlayerTurn, fetchAIMove, fetchAnalysis]
  )

  const undo = useCallback(() => {
    const total = moveHistoryUCIRef.current.length
    if (total === 0 || isThinking) return
    abortRef.current?.abort()
    const movesToUndo = total >= 2 ? 2 : 1
    const undone = moveHistoryUCIRef.current.slice(-movesToUndo)
    undoStackRef.current = [...undoStackRef.current, undone]
    moveHistoryUCIRef.current = moveHistoryUCIRef.current.slice(0, -movesToUndo)
    const newGame = new Chess()
    for (const uci of moveHistoryUCIRef.current) {
      newGame.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined })
    }
    setGame(newGame)
    setFen(newGame.fen())
    setMoveHistory(newGame.history())
    setMoveHistoryUCI([...moveHistoryUCIRef.current])
    setGameOver(null)
    setHighlightSquares({})
    setIsThinking(false)
    setCoachMove(null)
    setCanRedo(true)
    gameSavedRef.current = false
    fetchOpening(moveHistoryUCIRef.current)
    fetchAnalysis(newGame.fen())
  }, [isThinking, fetchAnalysis, fetchOpening])

  const redo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    const lastUndone = undoStackRef.current[undoStackRef.current.length - 1]
    undoStackRef.current = undoStackRef.current.slice(0, -1)
    const newHistory = [...moveHistoryUCIRef.current, ...lastUndone]
    const newGame = new Chess()
    for (const uci of newHistory) {
      newGame.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined })
    }
    moveHistoryUCIRef.current = newHistory
    setGame(newGame)
    setFen(newGame.fen())
    setMoveHistory(newGame.history())
    setMoveHistoryUCI([...moveHistoryUCIRef.current])
    setHighlightSquares({})
    setCoachMove(null)
    setCanRedo(undoStackRef.current.length > 0)
    if (newGame.isGameOver()) setGameOver(getGameOverReason(newGame))
    fetchAnalysis(newGame.fen())
  }, [fetchAnalysis])

  const fetchCoachMove = useCallback(async () => {
    if (game.isGameOver() || isThinking || isFetchingCoach) return
    setIsFetchingCoach(true)
    setCoachMove(null)
    try {
      const res = await fetch(`${API}/api/games/ai-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: game.fen(), strength: 'super_gm', time_limit_ms: 3000 }),
      })
      if (!res.ok) return
      const data: AIMoveInfo = await res.json()
      setCoachMove(data.move_uci)
    } catch (e) {
      console.error('Coach error', e)
    } finally {
      setIsFetchingCoach(false)
    }
  }, [game, isThinking, isFetchingCoach])

  const fetchGameReview = useCallback(async (depth = 10, timePerMoveMs = 200) => {
    if (moveHistoryUCI.length === 0) return
    setIsFetchingReview(true)
    setReviewData(null)
    try {
      const res = await fetch(`${API}/api/games/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves_uci: moveHistoryUCI, depth, time_per_move_ms: timePerMoveMs }),
      })
      if (!res.ok) return
      const data: GameReview = await res.json()
      setReviewData(data)
      setReviewIndex(data.total_moves)
    } catch (e) {
      console.error('Review error', e)
    } finally {
      setIsFetchingReview(false)
    }
  }, [moveHistoryUCI])

  const reviewFens = useMemo(() => {
    if (!reviewData) return [] as string[]
    const g = new Chess()
    const fens: string[] = [g.fen()]
    for (const mv of reviewData.moves) {
      try {
        g.move({ from: mv.uci.slice(0, 2), to: mv.uci.slice(2, 4), promotion: mv.uci[4] || undefined })
        fens.push(g.fen())
      } catch { break }
    }
    return fens
  }, [reviewData])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    moveHistoryUCIRef.current = []
    undoStackRef.current = []
    gameSavedRef.current = false
    setCanRedo(false)
    setCoachMove(null)
    setCurrentOpening(null)
    const g = new Chess()
    setGame(g)
    setFen(g.fen())
    setMoveHistory([])
    setMoveHistoryUCI([])
    setGameOver(null)
    setAiInfo(null)
    setAnalysis(null)
    setEvalCp(0)
    setHighlightSquares({})
    setIsThinking(false)
    setReviewData(null)
    setIsFetchingReview(false)
    setReviewIndex(0)
    if (playerColor === 'black') fetchAIMove(g.fen())
  }, [playerColor, fetchAIMove])

  return {
    game, fen, moveHistory, moveHistoryUCI, evalCp, analysis, aiInfo,
    isThinking, gameOver, highlightSquares,
    reviewData, isFetchingReview, reviewIndex, reviewFens,
    fetchGameReview, setReviewIndex,
    makePlayerMove, reset, fetchAnalysis, isPlayerTurn, saveGame,
    undo, redo, canUndo: moveHistory.length > 0 && !isThinking, canRedo,
    coachMove, isFetchingCoach, fetchCoachMove,
    currentOpening,
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
