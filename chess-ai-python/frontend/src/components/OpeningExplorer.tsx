import React, { useState, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { BookOpen, Search, BarChart2, TrendingUp } from 'lucide-react'

const API = 'http://localhost:8000'

interface OpeningInfo {
  eco: string
  name: string
  moves: string
}

interface BookMove {
  move: string
  frequency: number
}

interface PlatformStats {
  total_games: number
  white_win_pct: number
  black_win_pct: number
  draw_pct: number
}

interface ExplorerData {
  fen: string
  classification?: { eco: string; name: string }
  book_moves: BookMove[]
  platform_stats?: PlatformStats
}

export function OpeningExplorer() {
  const [game, setGame] = useState(new Chess())
  const [explorerData, setExplorerData] = useState<ExplorerData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OpeningInfo[]>([])
  const [loading, setLoading] = useState(false)

  const fetchExplorer = useCallback(async (fen: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/openings/explorer?fen=${encodeURIComponent(fen)}`)
      if (!res.ok) return
      const data: ExplorerData = await res.json()
      setExplorerData(data)
    } catch {} finally { setLoading(false) }
  }, [])

  const handleDrop = useCallback((from: string, to: string): boolean => {
    const newGame = new Chess(game.fen())
    const move = newGame.move({ from, to, promotion: 'q' })
    if (!move) return false
    setGame(newGame)
    fetchExplorer(newGame.fen())
    return true
  }, [game, fetchExplorer])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    try {
      const res = await fetch(`${API}/api/openings/search?q=${encodeURIComponent(searchQuery)}&limit=8`)
      if (!res.ok) return
      const data: OpeningInfo[] = await res.json()
      setSearchResults(data)
    } catch {}
  }, [searchQuery])

  const applyOpening = useCallback((pgn_moves: string) => {
    const newGame = new Chess()
    const tokens = pgn_moves.split(' ')
    for (const token of tokens) {
      if (/^\d+\./.test(token)) continue
      try { newGame.move(token) } catch { break }
    }
    setGame(newGame)
    setSearchResults([])
    setSearchQuery('')
    fetchExplorer(newGame.fen())
  }, [fetchExplorer])

  const reset = useCallback(() => {
    const g = new Chess()
    setGame(g)
    setExplorerData(null)
    setSearchResults([])
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-lg text-white">Opening Explorer</h2>
        </div>
        <button onClick={reset} className="text-xs text-slate-400 hover:text-white transition-colors">
          Reset board
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search opening name..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        <button onClick={handleSearch}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
          <Search className="w-4 h-4" />
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {searchResults.map(r => (
            <button key={r.eco} onClick={() => applyOpening(r.moves)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700 transition-colors text-left border-b border-slate-700 last:border-0">
              <div>
                <span className="text-amber-400 font-mono text-xs mr-2">{r.eco}</span>
                <span className="text-sm text-white">{r.name}</span>
              </div>
              <span className="text-xs text-slate-500 font-mono ml-2 shrink-0">{r.moves}</span>
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-slate-700">
        <Chessboard
          position={game.fen()}
          onPieceDrop={handleDrop}
          boardWidth={340}
          customDarkSquareStyle={{ backgroundColor: '#1e3a5f' }}
          customLightSquareStyle={{ backgroundColor: '#e8d5b7' }}
        />
      </div>

      {explorerData?.classification && (
        <div className="glass rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-mono font-bold text-sm">
              {explorerData.classification.eco}
            </span>
            <span className="text-white font-medium text-sm">{explorerData.classification.name}</span>
          </div>
        </div>
      )}

      {explorerData && explorerData.book_moves.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Book Moves ({explorerData.book_moves.length})
          </p>
          {explorerData.book_moves.slice(0, 6).map((bm, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-1.5">
              <span className="font-mono font-bold text-amber-300 text-sm">{bm.move}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full"
                       style={{ width: `${Math.min(100, bm.frequency)}%` }} />
                </div>
                <span className="text-xs text-slate-400 w-10 text-right">{bm.frequency}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {explorerData?.platform_stats && explorerData.platform_stats.total_games > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium uppercase tracking-wide">
            <BarChart2 className="w-3 h-3" /> Platform Stats ({explorerData.platform_stats.total_games} games)
          </div>
          <div className="rounded-lg overflow-hidden flex h-6 text-xs font-bold">
            <div className="flex items-center justify-center bg-white text-slate-900 transition-all"
                 style={{ width: `${explorerData.platform_stats.white_win_pct}%` }}>
              {explorerData.platform_stats.white_win_pct > 8
                ? `${explorerData.platform_stats.white_win_pct}%` : ''}
            </div>
            <div className="flex items-center justify-center bg-slate-500 text-white transition-all"
                 style={{ width: `${explorerData.platform_stats.draw_pct}%` }}>
              {explorerData.platform_stats.draw_pct > 8
                ? `${explorerData.platform_stats.draw_pct}%` : ''}
            </div>
            <div className="flex items-center justify-center bg-slate-900 text-white flex-1 border border-slate-700">
              {explorerData.platform_stats.black_win_pct > 8
                ? `${explorerData.platform_stats.black_win_pct}%` : ''}
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>♔ White {explorerData.platform_stats.white_win_pct}%</span>
            <span>Draw {explorerData.platform_stats.draw_pct}%</span>
            <span>{explorerData.platform_stats.black_win_pct}% Black ♚</span>
          </div>
        </div>
      )}

      {explorerData && explorerData.book_moves.length === 0 && !loading && (
        <p className="text-sm text-slate-500 text-center py-2">
          No book moves found — this is original territory!
        </p>
      )}
    </div>
  )
}
