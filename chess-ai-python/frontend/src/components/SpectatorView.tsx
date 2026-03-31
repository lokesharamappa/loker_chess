import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Eye, Wifi, WifiOff, MessageSquare, Clock, Send, Trophy, Zap } from 'lucide-react'
import clsx from 'clsx'

const WS_BASE = 'ws://localhost:8000'
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/* ── Types ─────────────────────────────────────────────────────────── */
type ConnStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

interface ChatMsg  { player_id: string; text: string; ts: number }
interface SanMove  { san: string; uci: string; moveNum: number; color: 'white' | 'black' }

/* ── Clock display ──────────────────────────────────────────────────── */
function LiveClock({ ms, active, label }: { ms: number; active: boolean; label: string }) {
  const secs  = Math.ceil(ms / 1000)
  const m     = Math.floor(secs / 60)
  const s     = secs % 60
  const low   = secs < 30
  return (
    <div className={clsx(
      'flex items-center justify-between px-3 py-2 rounded-lg transition-all',
      active ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800 border border-transparent',
    )}>
      <span className={clsx('text-xs font-medium', active ? 'text-amber-300' : 'text-slate-500')}>
        {label}
      </span>
      <span className={clsx(
        'font-mono font-bold text-lg tabular-nums',
        active && low ? 'text-red-400 animate-pulse' : active ? 'text-amber-300' : 'text-slate-400',
      )}>
        {m}:{s.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

/* ── Move list ──────────────────────────────────────────────────────── */
function MoveLine({ moves }: { moves: SanMove[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }) }, [moves])

  const pairs: [SanMove, SanMove | undefined][] = []
  for (let i = 0; i < moves.length; i += 2) pairs.push([moves[i], moves[i + 1]])

  return (
    <div ref={ref} className="flex-1 overflow-y-auto space-y-0.5 min-h-0 pr-1">
      {pairs.length === 0 && (
        <p className="text-slate-600 text-xs text-center pt-4">Waiting for moves…</p>
      )}
      {pairs.map(([w, b], i) => (
        <div key={i} className="flex gap-1 text-xs hover:bg-slate-800 rounded px-1">
          <span className="text-slate-600 w-6 text-right shrink-0 pt-0.5">{i + 1}.</span>
          <span className="flex-1 font-mono text-slate-200 px-1 py-0.5 rounded">{w.san}</span>
          <span className="flex-1 font-mono text-slate-400 px-1 py-0.5">{b?.san ?? ''}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Chat ───────────────────────────────────────────────────────────── */
function ChatPanel({ messages }: { messages: ChatMsg[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }) }, [messages])
  return (
    <div ref={ref} className="flex-1 overflow-y-auto space-y-1 min-h-0">
      {messages.length === 0 && (
        <p className="text-slate-700 text-xs text-center pt-3">No chat yet</p>
      )}
      {messages.map((m, i) => (
        <div key={i} className="text-xs">
          <span className="text-amber-400 font-medium">{m.player_id.slice(0, 8)}… </span>
          <span className="text-slate-300">{m.text}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────── */
export function SpectatorView() {
  const [gameIdInput, setGameIdInput]   = useState('')
  const [gameId, setGameId]             = useState('')
  const [status, setStatus]             = useState<ConnStatus>('idle')
  const [fen, setFen]                   = useState(START_FEN)
  const [turn, setTurn]                 = useState<'white' | 'black'>('white')
  const [whiteName, setWhiteName]       = useState<string | null>(null)
  const [blackName, setBlackName]       = useState<string | null>(null)
  const [whiteMs, setWhiteMs]           = useState(600_000)
  const [blackMs, setBlackMs]           = useState(600_000)
  const [moves, setMoves]               = useState<SanMove[]>([])
  const [chat, setChat]                 = useState<ChatMsg[]>([])
  const [gameOver, setGameOver]         = useState<{ result: string; reason: string } | null>(null)
  const [lastMove, setLastMove]         = useState<{ from: string; to: string } | null>(null)
  const [rightPanel, setRightPanel]     = useState<'moves' | 'chat'>('moves')
  const wsRef = useRef<WebSocket | null>(null)

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const connect = useCallback((id: string) => {
    if (!id.trim()) return
    disconnect()
    setGameId(id.trim())
    setStatus('connecting')
    setFen(START_FEN)
    setMoves([]); setChat([]); setGameOver(null); setLastMove(null)

    const ws = new WebSocket(`${WS_BASE}/ws/spectate/${id.trim()}`)
    wsRef.current = ws

    ws.onopen  = () => setStatus('connected')
    ws.onerror = () => setStatus('error')
    ws.onclose = () => setStatus(prev => prev === 'connected' ? 'disconnected' : prev)

    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string)
        switch (msg.type) {
          case 'spectator_joined':
            setFen(msg.fen ?? START_FEN)
            setWhiteName(msg.white_id ?? null)
            setBlackName(msg.black_id ?? null)
            break
          case 'game_start':
            setWhiteName(msg.white ?? null)
            setBlackName(msg.black ?? null)
            break
          case 'move':
            setFen(msg.fen)
            setTurn(msg.turn)
            setWhiteMs(msg.white_time_ms)
            setBlackMs(msg.black_time_ms)
            setLastMove({ from: msg.uci.slice(0, 2), to: msg.uci.slice(2, 4) })
            setMoves(prev => {
              const color: 'white' | 'black' = prev.length % 2 === 0 ? 'white' : 'black'
              return [...prev, {
                san: msg.san,
                uci: msg.uci,
                moveNum: Math.floor(prev.length / 2) + 1,
                color,
              }]
            })
            break
          case 'game_over':
            setGameOver({ result: msg.result, reason: msg.reason ?? 'unknown' })
            setStatus('disconnected')
            break
          case 'chat':
            setChat(prev => [...prev, { player_id: msg.player_id, text: msg.text, ts: msg.ts }])
            break
          case 'player_disconnected':
            setChat(prev => [...prev, { player_id: 'System', text: `${msg.player_id.slice(0, 8)}… disconnected`, ts: Date.now() / 1000 }])
            break
        }
      } catch { /* ignore malformed */ }
    }
  }, [disconnect])

  useEffect(() => () => { disconnect() }, [disconnect])

  const statusColor: Record<ConnStatus, string> = {
    idle: 'text-slate-600', connecting: 'text-amber-400',
    connected: 'text-green-400', disconnected: 'text-slate-500', error: 'text-red-400',
  }
  const statusLabel: Record<ConnStatus, string> = {
    idle: 'Not connected', connecting: 'Connecting…',
    connected: 'Live', disconnected: 'Disconnected', error: 'Connection failed',
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="glass rounded-2xl p-4 flex items-center gap-4">
        <Eye className="w-5 h-5 text-amber-400 shrink-0" />
        <div className="flex-1">
          <h2 className="font-bold text-slate-100">Spectator Mode</h2>
          <p className="text-xs text-slate-500">Watch any live game by game ID</p>
        </div>
        <div className={clsx('flex items-center gap-1.5 text-xs font-medium', statusColor[status])}>
          {status === 'connected'
            ? <Wifi className="w-4 h-4 animate-pulse" />
            : <WifiOff className="w-4 h-4" />}
          {statusLabel[status]}
        </div>
      </div>

      {/* Connect bar */}
      <div className="flex gap-2">
        <input
          value={gameIdInput}
          onChange={e => setGameIdInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && connect(gameIdInput)}
          placeholder="Enter Game ID (UUID)…"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
        />
        {status === 'connected' ? (
          <button onClick={disconnect}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg text-sm transition-colors">
            Disconnect
          </button>
        ) : (
          <button onClick={() => connect(gameIdInput)} disabled={status === 'connecting'}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg text-sm transition-colors">
            {status === 'connecting' ? 'Connecting…' : 'Watch'}
          </button>
        )}
      </div>

      {/* Game over banner */}
      {gameOver && (
        <div className="glass rounded-xl p-4 flex items-center gap-3 border border-amber-500/30">
          <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold text-slate-100">Game Over — {gameOver.result}</p>
            <p className="text-xs text-slate-400 capitalize">{gameOver.reason.replace('_', ' ')}</p>
          </div>
        </div>
      )}

      {/* Board + side panel */}
      {(status !== 'idle') && (
        <div className="flex gap-4 items-start">
          {/* Board column */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Black clock */}
            <LiveClock ms={blackMs} active={turn === 'black' && status === 'connected'} label={blackName ? `♚ ${blackName.slice(0, 12)}` : '♚ Black'} />

            <Chessboard
              position={fen}
              arePiecesDraggable={false}
              boardWidth={380}
              customBoardStyle={{ borderRadius: '10px' }}
              customDarkSquareStyle={{ backgroundColor: '#334155' }}
              customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
              customSquareStyles={lastMove ? {
                [lastMove.from]: { backgroundColor: 'rgba(245,158,11,0.3)' },
                [lastMove.to]:   { backgroundColor: 'rgba(245,158,11,0.45)' },
              } : {}}
            />

            {/* White clock */}
            <LiveClock ms={whiteMs} active={turn === 'white' && status === 'connected'} label={whiteName ? `♔ ${whiteName.slice(0, 12)}` : '♔ White'} />
          </div>

          {/* Side panel */}
          <div className="flex-1 glass rounded-xl flex flex-col" style={{ height: 460 }}>
            {/* Panel tabs */}
            <div className="flex border-b border-slate-700">
              {(['moves', 'chat'] as const).map(p => (
                <button key={p} onClick={() => setRightPanel(p)}
                  className={clsx('flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors capitalize',
                    rightPanel === p ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-500 hover:text-slate-300')}>
                  {p === 'moves' ? <Zap className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                  {p === 'moves' ? 'Moves' : 'Chat'}
                  {p === 'chat' && chat.length > 0 && (
                    <span className="ml-1 text-xs bg-amber-500/20 text-amber-400 px-1 rounded-full">{chat.length}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 p-3 min-h-0 overflow-hidden flex flex-col">
              {rightPanel === 'moves' && <MoveLine moves={moves} />}
              {rightPanel === 'chat'  && <ChatPanel messages={chat} />}
            </div>

            {/* Move count footer */}
            <div className="px-3 py-2 border-t border-slate-700 text-xs text-slate-600 text-center">
              {moves.length > 0
                ? `${Math.ceil(moves.length / 2)} move${Math.ceil(moves.length / 2) !== 1 ? 's' : ''} played`
                : status === 'connected' ? 'Waiting for first move…' : 'No moves yet'}
            </div>
          </div>
        </div>
      )}

      {/* Idle state */}
      {status === 'idle' && (
        <div className="text-center py-12 space-y-3">
          <Eye className="w-12 h-12 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm font-medium">No game selected</p>
          <p className="text-slate-600 text-xs max-w-xs mx-auto">
            Enter a Game ID above to start watching. Game IDs are shared by players
            using the WebSocket API at{' '}
            <code className="text-slate-400 bg-slate-800 px-1 rounded">{'ws://localhost:8000/ws/game/<id>/<playerId>'}</code>
          </p>
        </div>
      )}
    </div>
  )
}
