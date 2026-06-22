import { motion, useReducedMotion } from 'motion/react'
import { ExternalLink, Info } from 'lucide-react'
import ConfidenceBar from './ConfidenceBar'
import { getQuickGOLink } from '../../utils/goTermLink'

const NAMESPACE_CONFIG = {
  biological_process: { label: 'BP', bg: 'bg-bp/10', text: 'text-bp', border: 'border-bp/30' },
  molecular_function: { label: 'MF', bg: 'bg-mf/10', text: 'text-mf', border: 'border-mf/30' },
  cellular_component: { label: 'CC', bg: 'bg-cc/10', text: 'text-cc', border: 'border-cc/30' },
}

function NamespaceBadge({ namespace }) {
  const config = NAMESPACE_CONFIG[namespace] || {
    label: namespace?.slice(0, 2).toUpperCase() || '??',
    bg: 'bg-[var(--color-bg-muted)]',
    text: 'text-[var(--color-text-muted)]',
    border: 'border-[var(--color-border)]',
  }
  return (
    <span
      className={
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ' +
        'font-mono font-bold uppercase tracking-wider border flex-shrink-0 ' +
        config.bg + ' ' + config.text + ' ' + config.border
      }
    >
      {config.label}
    </span>
  )
}

function HierarchyBadge() {
  return (
    <div className="group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30">
      <span className="text-[10px] font-mono font-bold text-gold uppercase tracking-wider">
        100% Verified
      </span>
      <Info size={10} className="text-gold/70 cursor-help" />
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="glass-card rounded-lg border border-gold/20 p-3 text-left shadow-gold-glow">
          <p className="text-xs text-[var(--color-text-muted)] font-body leading-relaxed">
            This term was automatically confirmed because a child term exceeded the{' '}
            <span className="text-gold font-semibold">75% confidence threshold</span>
            {' '}— a biological hierarchy law.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="w-2 h-2 rotate-45 bg-[var(--color-card)] border-r border-b border-gold/20 -mt-1" />
        </div>
      </div>
    </div>
  )
}

export default function GOTermCard({ result, index = 0 }) {
  const shouldReduce = useReducedMotion()

  const goId        = result.go_term      || result.go_id             || '??'
  const goName      = result.go_name      || result.name              || result.group || 'Unknown function'
  const namespace   = result.namespace    || ''
  const score = result.predicted_by?.startsWith('Hierarchy')
  ? 1.0
  : (result.confidence ?? result.threshold ?? 0)
  const predictedBy = result.predicted_by || ''

  const isHierarchy = predictedBy === 'Hierarchy Tree Rule' || predictedBy === 'Hierarchy'
  const quickGOUrl  = getQuickGOLink(goId)

  const cardClass = isHierarchy
    ? 'border-gold/20 bg-gold/5 hover:border-gold/40 hover:shadow-gold-glow'
    : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-teal/30 hover:shadow-teal-glow'

  const linkClass = isHierarchy
    ? 'text-gold hover:text-gold-light'
    : 'text-teal hover:text-teal-light'

  return (
    <motion.div
      className={'group relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border transition-all duration-200 cursor-default ' + cardClass}
      initial={shouldReduce ? {} : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ x: 2 }}
    >
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={quickGOUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={'font-mono text-xs font-semibold tracking-wide flex items-center gap-1 transition-colors duration-150 ' + linkClass}
          onClick={function(e) { e.stopPropagation() }}
        >
          {goId}
          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0" />
        </a>
        <NamespaceBadge namespace={namespace} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text)] font-body leading-snug truncate sm:whitespace-normal">
          {goName}
        </p>
        {isHierarchy && (
          <p className="text-[10px] font-mono text-gold/60 mt-0.5">
            Biological Hierarchy Law
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-48">
        {isHierarchy && <HierarchyBadge />}
        <ConfidenceBar
          score={score}
          isHierarchy={isHierarchy}
          animated={true}
          showLabel={true}
          height="h-1.5"
        />
      </div>
    </motion.div>
  )
}