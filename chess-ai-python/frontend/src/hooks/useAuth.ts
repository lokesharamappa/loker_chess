import { useState, useCallback } from 'react'

const API = 'http://localhost:8000'
const STORAGE_KEY = 'chess_ai_auth'

export interface AuthUser {
  player_id: string
  username: string
  display_name: string
  rating: number
  access_token: string
}

function loadFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function saveToStorage(user: AuthUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(loadFromStorage)

  const register = useCallback(async (
    username: string,
    displayName: string,
    password: string,
  ): Promise<void> => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, display_name: displayName, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? `Registration failed (${res.status})`)
    }
    const data = await res.json()
    const authUser: AuthUser = {
      player_id:    data.player_id,
      username:     data.username,
      display_name: data.display_name,
      rating:       data.rating,
      access_token: data.access_token,
    }
    saveToStorage(authUser)
    setUser(authUser)
  }, [])

  const login = useCallback(async (
    username: string,
    password: string,
  ): Promise<void> => {
    const body = new URLSearchParams({ username, password })
    const res = await fetch(`${API}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? `Login failed (${res.status})`)
    }
    const data = await res.json()
    const authUser: AuthUser = {
      player_id:    data.player_id,
      username:     data.username,
      display_name: data.display_name,
      rating:       data.rating,
      access_token: data.access_token,
    }
    saveToStorage(authUser)
    setUser(authUser)
  }, [])

  const logout = useCallback(() => {
    clearStorage()
    setUser(null)
  }, [])

  const refreshRating = useCallback(async (newRating: number) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, rating: newRating }
      saveToStorage(updated)
      return updated
    })
  }, [])

  return { user, login, register, logout, refreshRating }
}
