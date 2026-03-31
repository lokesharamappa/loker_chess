import React, { useState } from 'react'
import { X, LogIn, UserPlus, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import type { AuthUser } from '../hooks/useAuth'

interface Props {
  onLogin:    (username: string, password: string) => Promise<void>
  onRegister: (username: string, displayName: string, password: string) => Promise<void>
  onClose:    () => void
}

type AuthTab = 'login' | 'register'

export function AuthModal({ onLogin, onRegister, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<AuthTab>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [username, setUsername]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')

  function reset() {
    setError(''); setUsername(''); setDisplayName(''); setPassword(''); setConfirm('')
  }

  function switchTab(t: AuthTab) { setActiveTab(t); reset() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (activeTab === 'register') {
      if (password !== confirm) { setError('Passwords do not match'); return }
      if (password.length < 6)  { setError('Password must be at least 6 characters'); return }
      if (!displayName.trim())  { setError('Display name is required'); return }
    }

    setLoading(true)
    try {
      if (activeTab === 'login') {
        await onLogin(username.trim(), password)
      } else {
        await onRegister(username.trim(), displayName.trim(), password)
      }
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm glass rounded-2xl p-6 shadow-2xl">
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-lg leading-tight">Chess AI Pro</h2>
            <p className="text-xs text-slate-500">Sign in to save progress & puzzles</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 mb-5">
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => switchTab(t)}
              className={clsx('flex-1 py-1.5 text-sm font-medium rounded-md transition-all capitalize',
                activeTab === t
                  ? 'bg-amber-500 text-slate-900'
                  : 'text-slate-400 hover:text-slate-200')}>
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Username */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              required minLength={3} maxLength={32}
              autoComplete="username"
              placeholder="e.g. magnus_c"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Display name (register only) */}
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Display Name</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required minLength={1} maxLength={64}
                placeholder="e.g. Magnus Carlsen"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required minLength={6}
                autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-9 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPass(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password (register only) */}
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Confirm Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
            ) : activeTab === 'login' ? (
              <><LogIn className="w-4 h-4" /> Sign In</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Create Account</>
            )}
          </button>
        </form>

        {/* Rating note for register */}
        {activeTab === 'register' && (
          <p className="mt-3 text-xs text-slate-600 text-center">
            Starts at 1500 ELO · Ratings update after each rated game
          </p>
        )}
      </div>
    </div>
  )
}
