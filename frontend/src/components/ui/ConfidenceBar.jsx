import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

function getBarColor(score) {
  if (score >= 0.85) return { bar: 'bg-teal',        text: 'text-teal'        }
  if (score >= 0.65) return { bar: 'bg-cyan',         text: 'text-cyan'        }
  if (score >= 0.45) return { bar: 'bg-violet',       text: 'text-violet'      }
  return                    { bar: 'bg-amber-400',    text: 'text-amber-400'   }
}

export default function ConfidenceBar({
  score = 0,
  isHierarchy = false,
  animated  = true,
  showLabel = true,
  height    = 'h-1.5',
}) {
  const [width, setWidth]   = useState(0)
  const shouldReduce        = useReducedMotion()
  const hasAnimated         = useRef(false)
  const ref                 = useRef(null)

  const colors = isHierarchy
    ? { bar: 'bg-gold', text: 'text-gold' }
    : getBarColor(score)

  const targetWidth = Math.round(score * 100)

  useEffect(() => {
    if (!animated || shouldReduce || hasAnimated.current) {
      setWidth(targetWidth)
      return
    }

    // Use IntersectionObserver so bar only animates when visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          // Small delay then animate to final value
          setTimeout(() => setWidth(targetWidth), 100)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [targetWidth, animated, shouldReduce])

  return (
    <div ref={ref} className="flex items-center gap-2.5 w-full">
      {/* Track */}
      <div className={`flex-1 ${height} rounded-full bg-[var(--color-bg-muted)]
        overflow-hidden min-w-0`}>
        <motion.div
          className={`${height} rounded-full ${colors.bar}
            ${isHierarchy ? 'shadow-gold-glow' : ''}`}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{
            duration: shouldReduce ? 0 : 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </div>

      {/* Label */}
      {showLabel && (
        <span className={`font-mono text-xs font-semibold flex-shrink-0
          ${colors.text} tabular-nums`}>
          {score.toFixed(4)}
        </span>
      )}
    </div>
  )
}