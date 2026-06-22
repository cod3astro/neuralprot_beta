import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Dna, Brain, Shield, Sparkles } from 'lucide-react'

const STAGES = [
  {
    icon: Dna,
    message: 'Assembling 498 biophysical shape metrics...',
    sub: 'Amino acid ratios · Dipeptide frequencies · Physical properties',
    color: 'teal',
    progress: 20,
  },
  {
    icon: Brain,
    message: 'Querying 375 model architectures...',
    sub: 'Each neural network votes on probable protein functions',
    color: 'cyan',
    progress: 55,
  },
  {
    icon: Shield,
    message: 'Running hierarchy safety gate check...',
    sub: 'Propagating confirmed child terms up the GO tree',
    color: 'violet',
    progress: 80,
  },
  {
    icon: Sparkles,
    message: 'Generating GO term predictions...',
    sub: 'Ranking results by confidence · Applying biological laws',
    color: 'teal',
    progress: 95,
  },
]

const colorMap = {
  teal:   { text: 'text-teal',   bg: 'bg-teal',   glow: 'shadow-teal-glow',   ring: 'border-teal/30',   iconBg: 'bg-teal/10'   },
  cyan:   { text: 'text-cyan',   bg: 'bg-cyan',   glow: 'shadow-cyan-glow',   ring: 'border-cyan/30',   iconBg: 'bg-cyan/10'   },
  violet: { text: 'text-violet', bg: 'bg-violet', glow: 'shadow-violet-glow', ring: 'border-violet/30', iconBg: 'bg-violet/10' },
}

// ── Skeleton loader row ───────────────────────────────────────
function SkeletonRow({ delay = 0 }) {
  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-xl
        border border-[var(--color-border)]"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      {/* GO term ID placeholder */}
      <div className="w-28 h-4 rounded-md bg-[var(--color-bg-muted)]
        animate-pulse flex-shrink-0" />
      {/* Name placeholder */}
      <div className="flex-1 h-4 rounded-md bg-[var(--color-bg-muted)]
        animate-pulse" />
      {/* Badge placeholder */}
      <div className="w-8 h-5 rounded-full bg-[var(--color-bg-muted)]
        animate-pulse flex-shrink-0" />
      {/* Bar placeholder */}
      <div className="w-24 h-3 rounded-full bg-[var(--color-bg-muted)]
        animate-pulse flex-shrink-0" />
    </motion.div>
  )
}

export default function LoadingNarrator({ isVisible, sequence }) {
  const [stageIndex, setStageIndex] = useState(0)
  const [displayProgress, setDisplayProgress] = useState(0)
  const shouldReduce = useReducedMotion()

  // Advance through stages automatically
  useEffect(() => {
    if (!isVisible) {
      setStageIndex(0)
      setDisplayProgress(0)
      return
    }

    const interval = setInterval(() => {
      setStageIndex(prev => {
        if (prev < STAGES.length - 1) return prev + 1
        return prev
      })
    }, 2200)

    return () => clearInterval(interval)
  }, [isVisible])

  // Smoothly animate progress bar
  useEffect(() => {
    if (!isVisible) return
    const target = STAGES[stageIndex].progress
    const step = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev >= target) { clearInterval(step); return target }
        return prev + 1
      })
    }, 18)
    return () => clearInterval(step)
  }, [stageIndex, isVisible])

  if (!isVisible) return null

  const stage = STAGES[stageIndex]
  const c = colorMap[stage.color]
  const Icon = stage.icon

  return (
    <AnimatePresence>
      <motion.div
        className="glass-card rounded-2xl border border-[var(--color-border)]
          overflow-hidden"
        initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35 }}
      >
        {/* Top progress bar */}
        <div className="h-0.5 bg-[var(--color-bg-muted)] w-full">
          <motion.div
            className={`h-full ${c.bg} rounded-full`}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        <div className="p-6 space-y-6">
          {/* Stage indicator */}
          <div className="flex items-start gap-4">
            {/* Icon */}
            <motion.div
              key={stageIndex}
              className={`w-11 h-11 rounded-xl flex items-center justify-center
                flex-shrink-0 border ${c.ring} ${c.iconBg}`}
              initial={shouldReduce ? {} : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Icon size={20} className={c.text} />
            </motion.div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`msg-${stageIndex}`}
                  className={`font-display font-semibold text-sm ${c.text} mb-1`}
                  initial={shouldReduce ? {} : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  {stage.message}
                </motion.p>
              </AnimatePresence>
              <AnimatePresence mode="wait">
                <motion.p
                  key={`sub-${stageIndex}`}
                  className="text-xs text-[var(--color-text-muted)] font-mono"
                  initial={shouldReduce ? {} : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                >
                  {stage.sub}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Percentage */}
            <div className={`font-mono font-bold text-lg ${c.text} flex-shrink-0`}>
              {displayProgress}%
            </div>
          </div>

          {/* Stage dots */}
          <div className="flex items-center gap-2">
            {STAGES.map((s, i) => {
              const dc = colorMap[s.color]
              return (
                <div key={i} className="flex items-center gap-2">
                  <motion.div
                    className={`h-1.5 rounded-full transition-all duration-300
                      ${i <= stageIndex
                        ? `${dc.bg} ${i === stageIndex ? 'w-6' : 'w-3'}`
                        : 'w-3 bg-[var(--color-border)]'
                      }`}
                    layout
                  />
                </div>
              )
            })}
            <span className="ml-auto text-xs font-mono text-[var(--color-text-muted)]">
              Stage {stageIndex + 1} of {STAGES.length}
            </span>
          </div>

          {/* Sequence preview */}
          {sequence && (
            <div className="rounded-lg border border-[var(--color-border)]
              bg-[var(--color-bg-muted)] px-4 py-2.5 overflow-hidden">
              <p className="text-xs font-mono text-[var(--color-text-muted)] mb-1">
                Processing sequence
              </p>
              <p className="font-mono text-xs text-teal truncate tracking-wider">
                {sequence.slice(0, 60)}
                {sequence.length > 60 && (
                  <span className="text-[var(--color-text-muted)]">
                    ...+{sequence.length - 60} aa
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Skeleton result preview */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-[var(--color-text-muted)] mb-3">
              Preparing results...
            </p>
            {[0, 1, 2, 3].map(i => (
              <SkeletonRow key={i} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}