/**
 * Chess sound effects using Web Audio API — no external assets needed.
 * All sounds generated procedurally with oscillators.
 */

type SoundType = 'move' | 'capture' | 'check' | 'checkmate' | 'start' | 'draw'

function playTones(
  notes: { freq: number; delay?: number; duration: number; type?: OscillatorType; vol?: number }[]
) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    notes.forEach(({ freq, delay = 0, duration, type = 'sine', vol = 0.18 }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + delay)
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + duration + 0.01)
    })
  } catch {
    /* silently fail — browser may block AudioContext before first user gesture */
  }
}

const SOUNDS: Record<SoundType, () => void> = {
  move: () => playTones([
    { freq: 900, duration: 0.07, type: 'triangle', vol: 0.15 },
  ]),
  capture: () => playTones([
    { freq: 350, duration: 0.06, type: 'sawtooth', vol: 0.22 },
    { freq: 200, delay: 0.05, duration: 0.09, type: 'sawtooth', vol: 0.14 },
  ]),
  check: () => playTones([
    { freq: 660, duration: 0.10, type: 'square', vol: 0.18 },
    { freq: 880, delay: 0.13, duration: 0.10, type: 'square', vol: 0.18 },
  ]),
  checkmate: () => playTones([
    { freq: 523, duration: 0.25, type: 'sine', vol: 0.22 },
    { freq: 392, delay: 0.28, duration: 0.25, type: 'sine', vol: 0.22 },
    { freq: 330, delay: 0.56, duration: 0.40, type: 'sine', vol: 0.22 },
  ]),
  start: () => playTones([
    { freq: 523, duration: 0.18, type: 'sine', vol: 0.16 },
    { freq: 659, delay: 0.20, duration: 0.18, type: 'sine', vol: 0.16 },
    { freq: 784, delay: 0.40, duration: 0.25, type: 'sine', vol: 0.18 },
  ]),
  draw: () => playTones([
    { freq: 523, duration: 0.18, type: 'sine', vol: 0.16 },
    { freq: 494, delay: 0.20, duration: 0.30, type: 'sine', vol: 0.14 },
  ]),
}

export function useSound(enabled = true) {
  const play = (type: SoundType) => {
    if (!enabled) return
    SOUNDS[type]?.()
  }
  return { play }
}
