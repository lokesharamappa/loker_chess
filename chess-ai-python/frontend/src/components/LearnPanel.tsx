import React, { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import clsx from 'clsx'
import { BookOpen, Brain, Crown, Target, Zap, ArrowLeft, CheckCircle2, Circle, Star } from 'lucide-react'
import { LESSONS, CATEGORIES, type Lesson, type Category, type Level } from './learn-content'

const LEVEL_BADGE: Record<Level, string> = {
  beginner:     'bg-green-700 text-green-100',
  intermediate: 'bg-blue-700 text-blue-100',
  advanced:     'bg-purple-700 text-purple-100',
}

const CAT_RING: Record<Category, string> = {
  openings:   'border-amber-500/50',
  middlegame: 'border-blue-500/50',
  endgame:    'border-green-500/50',
  psychology: 'border-purple-500/50',
  thinking:   'border-rose-500/50',
}

const CAT_ACCENT: Record<Category, string> = {
  openings:   'text-amber-400',
  middlegame: 'text-blue-400',
  endgame:    'text-green-400',
  psychology: 'text-purple-400',
  thinking:   'text-rose-400',
}

const CAT_BG: Record<Category, string> = {
  openings:   'bg-amber-500/10 hover:bg-amber-500/20',
  middlegame: 'bg-blue-500/10 hover:bg-blue-500/20',
  endgame:    'bg-green-500/10 hover:bg-green-500/20',
  psychology: 'bg-purple-500/10 hover:bg-purple-500/20',
  thinking:   'bg-rose-500/10 hover:bg-rose-500/20',
}

const CAT_ICON: Record<Category, React.ReactNode> = {
  openings:   <BookOpen className="w-4 h-4" />,
  middlegame: <Zap className="w-4 h-4" />,
  endgame:    <Crown className="w-4 h-4" />,
  psychology: <Brain className="w-4 h-4" />,
  thinking:   <Target className="w-4 h-4" />,
}

function LessonCard({ lesson, completed, onClick }: { lesson: Lesson; completed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left rounded-xl border p-3 transition-all',
        CAT_RING[lesson.category],
        CAT_BG[lesson.category],
        'group'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', LEVEL_BADGE[lesson.level])}>
              {lesson.level}
            </span>
            {completed && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
          </div>
          <p className="font-semibold text-sm text-white leading-tight">{lesson.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{lesson.subtitle}</p>
        </div>
        <span className={clsx('text-xs mt-1 flex-shrink-0 transition-transform group-hover:translate-x-0.5', CAT_ACCENT[lesson.category])}>›</span>
      </div>
    </button>
  )
}

function LessonDetail({
  lesson, completed, onBack, onComplete,
}: {
  lesson: Lesson; completed: boolean; onBack: () => void; onComplete: () => void
}) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pb-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', LEVEL_BADGE[lesson.level])}>
          {lesson.level}
        </span>
        <span className={clsx('text-xs font-semibold uppercase tracking-wide', CAT_ACCENT[lesson.category])}>
          {lesson.category}
        </span>
      </div>

      <div>
        <h2 className="text-base font-bold text-white leading-tight">{lesson.title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{lesson.subtitle}</p>
      </div>

      {/* Mini board */}
      <div className="flex justify-center">
        <div className="rounded-lg overflow-hidden shadow-lg" style={{ width: 200 }}>
          <Chessboard
            position={lesson.fen}
            boardWidth={200}
            arePiecesDraggable={false}
            customDarkSquareStyle={{ backgroundColor: '#1e3a5f' }}
            customLightSquareStyle={{ backgroundColor: '#e8d5b7' }}
            customBoardStyle={{ borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* Key points */}
      <div className={clsx('rounded-xl border p-3', CAT_RING[lesson.category])}>
        <p className={clsx('text-xs font-bold uppercase tracking-wide mb-2', CAT_ACCENT[lesson.category])}>
          ⚡ Key Points
        </p>
        <ul className="space-y-1">
          {lesson.keyPoints.map((pt, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
              <Star className={clsx('w-3 h-3 mt-0.5 flex-shrink-0', CAT_ACCENT[lesson.category])} />
              {pt}
            </li>
          ))}
        </ul>
      </div>

      {/* Content paragraphs */}
      <div className="space-y-3">
        {lesson.paragraphs.map((para, i) => (
          <p key={i} className="text-xs text-slate-300 leading-relaxed">{para}</p>
        ))}
      </div>

      {/* Famous note */}
      {lesson.famousNote && (
        <div className="rounded-xl bg-slate-800/70 border border-slate-600/50 p-3">
          <p className="text-xs font-bold text-amber-400 mb-1">🏆 World-Class Insight</p>
          <p className="text-xs text-slate-300 italic leading-relaxed">{lesson.famousNote}</p>
        </div>
      )}

      {/* Complete button */}
      {!completed ? (
        <button
          onClick={onComplete}
          className="w-full py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" /> Mark as Complete
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-green-900/40 border border-green-500/30 text-green-400 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" /> Completed
        </div>
      )}
    </div>
  )
}

export function LearnPanel() {
  const [activeCategory, setActiveCategory] = useState<Category>('openings')
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [levelFilter, setLevelFilter] = useState<Level | 'all'>('all')
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set<string>(JSON.parse(localStorage.getItem('chess_learn_completed') ?? '[]'))
  )

  const markComplete = (id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('chess_learn_completed', JSON.stringify([...next]))
      return next
    })
  }

  const filteredLessons = LESSONS.filter(
    l => l.category === activeCategory && (levelFilter === 'all' || l.level === levelFilter)
  )

  const totalCompleted = LESSONS.filter(l => completedIds.has(l.id)).length

  if (selectedLesson) {
    return (
      <LessonDetail
        lesson={selectedLesson}
        completed={completedIds.has(selectedLesson.id)}
        onBack={() => setSelectedLesson(null)}
        onComplete={() => markComplete(selectedLesson.id)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Chess Academy</h2>
          <p className="text-xs text-slate-400">{totalCompleted}/{LESSONS.length} lessons completed</p>
        </div>
        <div className="text-xs text-slate-500">
          {Math.round((totalCompleted / LESSONS.length) * 100)}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${(totalCompleted / LESSONS.length) * 100}%` }}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(cat => {
          const count = LESSONS.filter(l => l.category === cat.id && completedIds.has(l.id)).length
          const total = LESSONS.filter(l => l.category === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={clsx(
                'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                activeCategory === cat.id
                  ? clsx(CAT_RING[cat.id], CAT_BG[cat.id], CAT_ACCENT[cat.id])
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              )}
            >
              {CAT_ICON[cat.id]}
              <span>{cat.label}</span>
              <span className="text-slate-500">{count}/{total}</span>
            </button>
          )
        })}
      </div>

      {/* Level filter */}
      <div className="flex gap-1">
        {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(lvl => (
          <button
            key={lvl}
            onClick={() => setLevelFilter(lvl)}
            className={clsx(
              'px-2 py-0.5 rounded text-xs capitalize transition-all',
              levelFilter === lvl
                ? lvl === 'all' ? 'bg-slate-600 text-white' : clsx(LEVEL_BADGE[lvl as Level])
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Category description */}
      <p className="text-xs text-slate-500">
        {CATEGORIES.find(c => c.id === activeCategory)?.desc}
      </p>

      {/* Lesson list */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1">
        {filteredLessons.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No lessons match this filter.</p>
        ) : (
          filteredLessons.map(lesson => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              completed={completedIds.has(lesson.id)}
              onClick={() => setSelectedLesson(lesson)}
            />
          ))
        )}
      </div>
    </div>
  )
}
