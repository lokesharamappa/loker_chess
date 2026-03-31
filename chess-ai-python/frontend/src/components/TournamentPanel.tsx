import React, { useState, useCallback } from 'react'
import {
  Trophy, Plus, Search, Users, Play, ChevronRight,
  ChevronLeft, AlertCircle, CheckCircle, Clock, RotateCcw,
  Table2, BarChart2, UserPlus, Flag,
} from 'lucide-react'
import clsx from 'clsx'
import type { AuthUser } from '../hooks/useAuth'

const API = 'http://localhost:8000'

/* ── Types ─────────────────────────────────────────────────────────── */
interface Standing {
  rank: number
  player_id: string
  name: string
  rating: number
  score: number
  games_played: number
  buchholz: number
  sonneborn_berger: number
}

interface Pairing {
  white: string
  black: string
  result: string | null
}

interface TournamentStatus {
  tournament_id: string
  name: string
  format: string
  current_round: number
  total_rounds: number
  player_count: number
  is_finished: boolean
  standings: Standing[]
}

type TView = 'lobby' | 'create' | 'tournament'
type TTab  = 'standings' | 'pairings' | 'crosstable' | 'register'

/* ── Helpers ────────────────────────────────────────────────────────── */
const FORMAT_LABELS: Record<string, string> = {
  swiss: 'Swiss', round_robin: 'Round Robin', knockout: 'Knockout',
}
const TC_LABELS: Record<string, string> = {
  bullet: '🔴 Bullet', blitz: '⚡ Blitz', rapid: '🕐 Rapid', classical: '🏛 Classical',
}

function ResultBadge({ result }: { result: string | null }) {
  if (!result || result === 'pending') {
    return <span className="text-xs text-slate-600 italic">pending</span>
  }
  const colors: Record<string, string> = {
    '1-0':      'bg-green-500/20 text-green-400',
    '0-1':      'bg-red-500/20 text-red-400',
    '1/2-1/2':  'bg-slate-500/20 text-slate-400',
    'W':        'bg-green-500/20 text-green-400',
    'L':        'bg-red-500/20 text-red-400',
    'BYE':      'bg-amber-500/20 text-amber-400',
  }
  return (
    <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', colors[result] ?? 'text-slate-400')}>
      {result}
    </span>
  )
}

function ScorePip({ score }: { score: number }) {
  const color = score >= 1 ? 'text-green-400' : score === 0.5 ? 'text-yellow-400' : 'text-slate-500'
  return <span className={clsx('font-mono font-bold tabular-nums', color)}>{score}</span>
}

/* ── Standings Table ────────────────────────────────────────────────── */
function StandingsTable({ standings }: { standings: Standing[] }) {
  if (standings.length === 0)
    return <p className="text-slate-600 text-sm text-center py-8">No players registered yet</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            {['#', 'Player', 'Rtg', 'Pts', 'GP', 'Bkh', 'SB'].map(h => (
              <th key={h} className="text-left text-xs text-slate-500 font-medium px-2 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map(p => (
            <tr key={p.player_id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
              <td className="px-2 py-2 text-slate-500 text-xs">{p.rank}</td>
              <td className="px-2 py-2">
                <div className="font-medium text-slate-200 truncate max-w-28">{p.name}</div>
                <div className="text-xs text-slate-600">{p.rating} ELO</div>
              </td>
              <td className="px-2 py-2 text-slate-400 text-xs tabular-nums">{p.rating}</td>
              <td className="px-2 py-2"><ScorePip score={p.score} /></td>
              <td className="px-2 py-2 text-slate-500 text-xs">{p.games_played}</td>
              <td className="px-2 py-2 text-slate-500 text-xs tabular-nums">{p.buchholz}</td>
              <td className="px-2 py-2 text-slate-500 text-xs tabular-nums">{p.sonneborn_berger}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Pairings Panel ─────────────────────────────────────────────────── */
function PairingsPanel({
  tournamentId, currentRound, totalRounds, isFinished, standings, onRefresh,
}: {
  tournamentId: string
  currentRound: number
  totalRounds: number
  isFinished: boolean
  standings: Standing[]
  onRefresh: () => void
}) {
  const [round, setRound] = useState(Math.max(1, currentRound))
  const [pairings, setPairings] = useState<Pairing[]>([])
  const [loadingPairings, setLoadingPairings] = useState(false)
  const [startingRound, setStartingRound] = useState(false)
  const [recordingFor, setRecordingFor] = useState<number | null>(null)
  const [error, setError] = useState('')

  const nameOf = useCallback((id: string) =>
    standings.find(s => s.player_id === id)?.name ?? id.slice(0, 10) + '…'
  , [standings])

  const fetchPairings = useCallback(async (r: number) => {
    setLoadingPairings(true); setError('')
    try {
      const res = await fetch(`${API}/api/tournaments/${tournamentId}/rounds/${r}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPairings(data.pairings ?? [])
    } catch (e: any) {
      setError(e.message); setPairings([])
    } finally {
      setLoadingPairings(false)
    }
  }, [tournamentId])

  const loadRound = (r: number) => { setRound(r); fetchPairings(r) }

  const startRound = async () => {
    setStartingRound(true); setError('')
    try {
      const res = await fetch(`${API}/api/tournaments/${tournamentId}/start-round`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail ?? 'Failed') }
      const data = await res.json()
      setPairings(data.pairings ?? [])
      setRound(data.round)
      onRefresh()
    } catch (e: any) { setError(e.message) }
    finally { setStartingRound(false) }
  }

  const recordResult = async (pairIdx: number, result: string) => {
    const p = pairings[pairIdx]
    setError('')
    try {
      const res = await fetch(
        `${API}/api/tournaments/${tournamentId}/result?round_number=${round}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ white_id: p.white, black_id: p.black, result }),
        }
      )
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail ?? 'Failed') }
      setPairings(prev => prev.map((pp, i) => i === pairIdx ? { ...pp, result } : pp))
      setRecordingFor(null)
      onRefresh()
    } catch (e: any) { setError(e.message) }
  }

  const allResultsIn = pairings.length > 0 && pairings.every(p => p.result && p.result !== 'pending')
  const canStartNext = allResultsIn && !isFinished && round === currentRound && currentRound < totalRounds

  return (
    <div className="space-y-3">
      {/* Round nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => round > 1 && loadRound(round - 1)} disabled={round <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-400 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-200 min-w-24 text-center">
            Round {round} / {totalRounds}
          </span>
          <button onClick={() => round < currentRound && loadRound(round + 1)} disabled={round >= currentRound}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => fetchPairings(round)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors" title="Refresh">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        {canStartNext && (
          <button onClick={startRound} disabled={startingRound}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg text-xs transition-colors">
            <Play className="w-3.5 h-3.5" />
            {startingRound ? 'Starting…' : `Start Round ${round + 1}`}
          </button>
        )}
        {round === 0 || (currentRound === 0) ? (
          <button onClick={startRound} disabled={startingRound}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg text-xs transition-colors">
            <Play className="w-3.5 h-3.5" />
            {startingRound ? 'Starting…' : 'Start Round 1'}
          </button>
        ) : null}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      {loadingPairings ? (
        <p className="text-slate-500 text-sm text-center py-6">Loading pairings…</p>
      ) : pairings.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Flag className="w-8 h-8 text-slate-700 mx-auto" />
          <p className="text-slate-500 text-sm">No pairings yet for this round.</p>
          {currentRound === 0 && (
            <p className="text-slate-600 text-xs">Use "Start Round 1" to generate pairings.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {pairings.map((p, i) => (
            <div key={i} className="glass rounded-lg px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs text-slate-500 shrink-0">Board {i + 1}</span>
                  <span className="text-sm font-medium text-slate-200 truncate">♔ {nameOf(p.white)}</span>
                  <span className="text-xs text-slate-600">vs</span>
                  <span className="text-sm text-slate-300 truncate">♚ {nameOf(p.black)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ResultBadge result={p.result} />
                  {(!p.result || p.result === 'pending') && (
                    <button onClick={() => setRecordingFor(recordingFor === i ? null : i)}
                      className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                      Record
                    </button>
                  )}
                </div>
              </div>

              {/* Result picker */}
              {recordingFor === i && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-700">
                  {[['1-0','White wins','text-green-400'], ['0-1','Black wins','text-red-400'],
                    ['1/2-1/2','Draw','text-slate-400'], ['W','Forfeit W','text-green-400'],
                    ['L','Forfeit L','text-red-400'], ['BYE','Bye','text-amber-400']].map(([val, label, cls]) => (
                    <button key={val} onClick={() => recordResult(i, val)}
                      className={clsx('text-xs px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors font-mono', cls)}>
                      {val}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isFinished && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg p-3">
          <Trophy className="w-4 h-4 shrink-0" />
          Tournament finished! Check standings for final results.
        </div>
      )}
    </div>
  )
}

/* ── Crosstable Panel ───────────────────────────────────────────────── */
function CrosstablePanel({ tournamentId }: { tournamentId: string }) {
  const [table, setTable] = useState<Record<string, Record<string, string>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/tournaments/${tournamentId}/crosstable`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTable(data.crosstable ?? {})
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!table) return (
    <div className="text-center py-8 space-y-3">
      <Table2 className="w-8 h-8 text-slate-700 mx-auto" />
      <p className="text-slate-500 text-sm">Load cross-table to see head-to-head results</p>
      <button onClick={load} disabled={loading}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
        {loading ? 'Loading…' : 'Load Crosstable'}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )

  const players = Object.keys(table)
  if (players.length === 0)
    return <p className="text-slate-600 text-sm text-center py-8">No data yet</p>

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="text-left px-2 py-1.5 text-slate-500 font-medium border-b border-slate-700">Player</th>
            {players.map((p, i) => (
              <th key={p} className="px-2 py-1.5 text-slate-500 font-medium border-b border-slate-700 text-center">
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p, ri) => (
            <tr key={p} className="border-b border-slate-800/40 hover:bg-slate-800/30">
              <td className="px-2 py-1.5 text-slate-300 font-medium whitespace-nowrap">
                <span className="text-slate-600 mr-1">{ri + 1}.</span>{p.slice(0, 14)}
              </td>
              {players.map((opp, ci) => {
                const val = table[p]?.[opp]
                const isSelf = ri === ci
                return (
                  <td key={opp}
                    className={clsx('px-2 py-1.5 text-center font-mono',
                      isSelf ? 'bg-slate-800/60 text-slate-700' : '',
                      val === '1' ? 'text-green-400' : val === '0' ? 'text-red-400' : val === '0.5' ? 'text-yellow-400' : 'text-slate-600'
                    )}>
                    {isSelf ? '×' : (val ?? '·')}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Register Panel ─────────────────────────────────────────────────── */
function RegisterPanel({
  tournamentId, user, onRegistered,
}: {
  tournamentId: string
  user: AuthUser | null
  onRegistered: () => void
}) {
  const [pid, setPid]     = useState(user?.player_id ?? '')
  const [name, setName]   = useState(user?.display_name ?? '')
  const [rating, setRating] = useState(user ? String(Math.round(user.rating)) : '1500')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const register = async () => {
    setLoading(true); setError(''); setSuccess(false)
    try {
      const res = await fetch(`${API}/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: pid.trim(), name: name.trim(), rating: parseFloat(rating) }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail ?? 'Registration failed') }
      setSuccess(true)
      onRegistered()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3 max-w-xs">
      {success && (
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 rounded-lg p-3">
          <CheckCircle className="w-4 h-4 shrink-0" />Registered successfully!
        </div>
      )}
      {[
        { label: 'Player ID', val: pid, set: setPid, placeholder: 'UUID or custom ID' },
        { label: 'Display Name', val: name, set: setName, placeholder: 'Your name' },
        { label: 'Rating', val: rating, set: setRating, placeholder: '1500', type: 'number' },
      ].map(({ label, val, set, placeholder, type }) => (
        <div key={label}>
          <label className="block text-xs text-slate-400 mb-1">{label}</label>
          <input type={type ?? 'text'} value={val} onChange={e => set(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors" />
        </div>
      ))}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}
      <button onClick={register} disabled={loading || !pid.trim() || !name.trim()}
        className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
        <UserPlus className="w-4 h-4" />
        {loading ? 'Registering…' : 'Register'}
      </button>
    </div>
  )
}

/* ── Tournament View ────────────────────────────────────────────────── */
function TournamentView({
  tid, user, onBack,
}: {
  tid: string; user: AuthUser | null; onBack: () => void
}) {
  const [data, setData] = useState<TournamentStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TTab>('standings')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/tournaments/${tid}`)
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail ?? `HTTP ${res.status}`) }
      setData(await res.json())
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [tid])

  React.useEffect(() => { load() }, [load])

  if (loading && !data)
    return <div className="text-center py-12 text-slate-500 text-sm">Loading tournament…</div>

  if (error && !data)
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-300">← Back</button>
      </div>
    )

  if (!data) return null

  const roundProgress = data.current_round > 0
    ? `Round ${data.current_round} / ${data.total_rounds}`
    : 'Not started'

  const TABS: { id: TTab; label: string; icon: React.ReactNode }[] = [
    { id: 'standings', label: 'Standings', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'pairings',  label: 'Pairings',  icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'crosstable',label: 'Crosstable',icon: <Table2 className="w-3.5 h-3.5" /> },
    { id: 'register',  label: 'Register',  icon: <UserPlus className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className={clsx('w-5 h-5', data.is_finished ? 'text-amber-400' : 'text-slate-400')} />
            <h3 className="font-bold text-slate-100 text-base">{data.name}</h3>
            {data.is_finished && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">Finished</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span>{FORMAT_LABELS[data.format] ?? data.format}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{roundProgress}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{data.player_count} players</span>
          </div>
          <p className="text-xs text-slate-700 mt-1 font-mono">{tid}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={load} title="Refresh"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={onBack}
            className="text-xs px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors">
            ← Back
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all',
              tab === t.id ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'standings'  && <StandingsTable standings={data.standings} />}
        {tab === 'pairings'   && (
          <PairingsPanel
            tournamentId={tid}
            currentRound={data.current_round}
            totalRounds={data.total_rounds}
            isFinished={data.is_finished}
            standings={data.standings}
            onRefresh={load}
          />
        )}
        {tab === 'crosstable' && <CrosstablePanel tournamentId={tid} />}
        {tab === 'register'   && <RegisterPanel tournamentId={tid} user={user} onRegistered={load} />}
      </div>
    </div>
  )
}

/* ── Create Form ────────────────────────────────────────────────────── */
function CreateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName]         = useState('')
  const [format, setFormat]     = useState('swiss')
  const [tc, setTc]             = useState('rapid')
  const [rounds, setRounds]     = useState('7')
  const [maxPl, setMaxPl]       = useState('16')
  const [rated, setRated]       = useState(true)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const create = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/tournaments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), format, time_control: tc,
          rounds: parseInt(rounds), max_players: parseInt(maxPl), rated,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail ?? 'Failed') }
      const data = await res.json()
      onCreated(data.tournament_id)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Tournament Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Saturday Blitz Open"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500">
            <option value="swiss">Swiss</option>
            <option value="round_robin">Round Robin</option>
            <option value="knockout">Knockout</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Time Control</label>
          <select value={tc} onChange={e => setTc(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500">
            <option value="bullet">Bullet</option>
            <option value="blitz">Blitz</option>
            <option value="rapid">Rapid</option>
            <option value="classical">Classical</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Rounds</label>
          <input type="number" min={1} max={15} value={rounds} onChange={e => setRounds(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Max Players</label>
          <input type="number" min={2} max={256} value={maxPl} onChange={e => setMaxPl(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500" />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
        <input type="checkbox" checked={rated} onChange={e => setRated(e.target.checked)}
          className="w-4 h-4 accent-amber-500" />
        Rated tournament
      </label>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      <button onClick={create} disabled={loading}
        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" />
        {loading ? 'Creating…' : 'Create Tournament'}
      </button>
    </div>
  )
}

/* ── Main Export ────────────────────────────────────────────────────── */
export function TournamentPanel({ user }: { user: AuthUser | null }) {
  const [view, setView]             = useState<TView>('lobby')
  const [activeTid, setActiveTid]   = useState('')
  const [searchInput, setSearchInput] = useState('')

  const openTournament = (id: string) => { setActiveTid(id); setView('tournament') }

  return (
    <div className="glass rounded-2xl p-5 space-y-4 w-full max-w-2xl mx-auto">
      {/* Title bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-slate-100 text-lg">Tournaments</h2>
        </div>
        {view !== 'lobby' && (
          <button onClick={() => setView('lobby')}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors">
            ← Lobby
          </button>
        )}
      </div>

      {/* ── LOBBY ── */}
      {view === 'lobby' && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setView('create')}
              className="flex flex-col items-center gap-2 p-5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-200">Create</p>
                <p className="text-xs text-slate-500">New tournament</p>
              </div>
            </button>
            <button onClick={() => searchInput.trim() && openTournament(searchInput.trim())}
              className="flex flex-col items-center gap-2 p-5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors">
                <Search className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-200">Join / View</p>
                <p className="text-xs text-slate-500">By tournament ID</p>
              </div>
            </button>
          </div>

          {/* Search by ID */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchInput.trim() && openTournament(searchInput.trim())}
                placeholder="Enter Tournament ID (UUID)…"
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button onClick={() => searchInput.trim() && openTournament(searchInput.trim())}
              disabled={!searchInput.trim()}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 font-medium rounded-lg text-sm transition-colors">
              Open
            </button>
          </div>

          {/* Info */}
          <div className="glass rounded-xl p-4 space-y-2">
            <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />Supported Formats
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Swiss', desc: 'Buchholz tiebreaks, paired by score' },
                { label: 'Round Robin', desc: 'Everyone plays everyone' },
                { label: 'Knockout', desc: 'Single elimination bracket' },
              ].map(f => (
                <div key={f.label} className="bg-slate-800/60 rounded-lg p-2.5 space-y-0.5">
                  <p className="text-xs font-semibold text-slate-200">{f.label}</p>
                  <p className="text-xs text-slate-600">{f.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 pt-1">
              FIDE K-factor rating applied after each rated game. Tiebreaks: Buchholz + Sonneborn-Berger.
            </p>
          </div>
        </div>
      )}

      {/* ── CREATE ── */}
      {view === 'create' && (
        <CreateForm onCreated={id => { openTournament(id) }} />
      )}

      {/* ── TOURNAMENT VIEW ── */}
      {view === 'tournament' && activeTid && (
        <TournamentView tid={activeTid} user={user} onBack={() => setView('lobby')} />
      )}
    </div>
  )
}
