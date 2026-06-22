import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Brain, GitBranch, Download, ChevronDown, ChevronUp, Info } from 'lucide-react'
import GOTermCard from '../ui/GOTermCard'
import NamespaceFilter from '../ui/NamespaceFilter'
import { sortResults } from '../../utils/sortResults'

const NAMESPACE_MAP = {
  BP: 'biological_process',
  MF: 'molecular_function',
  CC: 'cellular_component',
}

const PAGE_SIZE = 50

// ── Download helpers ──────────────────────────────────────────
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function downloadCSV(data, filename) {
  const headers = ['go_term', 'go_name', 'namespace', 'confidence', 'predicted_by']
  const rows = data.map(r => [
    r.go_term      || r.go_id    || '',
    r.go_name      || r.name     || r.group || '',
    r.namespace    || '',
    (r.confidence  ?? r.threshold  ?? 0).toFixed(4),
    r.predicted_by || '',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Confidence legend ─────────────────────────────────────────
function ConfidenceLegend() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
          border border-[var(--color-border)] text-xs font-display
          text-[var(--color-text-muted)] hover:text-teal hover:border-teal/40
          transition-colors duration-200 cursor-pointer"
      >
        <Info size={12} />
        Confidence Guide
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full right-0 mt-2 w-72 z-50
              glass-card rounded-xl border border-[var(--color-border)] p-4 shadow-card-dark"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs font-display font-semibold text-[var(--color-text)] mb-3">
              How confidence is calculated
            </p>
            <p className="text-xs font-body text-[var(--color-text-muted)] leading-relaxed mb-4">
              Each score is the average vote across{' '}
              <span className="text-teal font-semibold">375 neural networks</span>.
              A score of 0.80 means 80% of models agreed this protein has that function.
            </p>
            <div className="space-y-2">
              {[
                { label: 'Very High',  range: '≥ 0.85', color: 'bg-teal',     text: 'text-teal',    desc: 'Strong ensemble consensus'   },
                { label: 'High',       range: '≥ 0.65', color: 'bg-cyan',     text: 'text-cyan',    desc: 'Good model agreement'        },
                { label: 'Moderate',   range: '≥ 0.45', color: 'bg-violet',   text: 'text-violet',  desc: 'Partial consensus'           },
                { label: 'Low',        range: '< 0.45', color: 'bg-amber-400',text: 'text-amber-400',desc: 'Weak signal — use cautiously'},
              ].map(tier => (
                <div key={tier.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tier.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-semibold ${tier.text}`}>
                        {tier.label}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                        {tier.range}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-body">
                      {tier.desc}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-gold" />
                <div className="flex-1">
                  <span className="text-xs font-mono font-semibold text-gold">Hierarchy</span>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-body">
                    Confirmed by GO True Path Rule
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Panel header ──────────────────────────────────────────────
function PanelHeader({ icon: Icon, label, count, isHierarchy }) {
  return (
    <div className={`flex items-center gap-2.5 pb-3 border-b
      ${isHierarchy ? 'border-gold/20' : 'border-[var(--color-border)]'}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center
        ${isHierarchy
          ? 'bg-gold/10 border border-gold/30'
          : 'bg-teal/10 border border-teal/30'}`}>
        <Icon size={14} className={isHierarchy ? 'text-gold' : 'text-teal'} />
      </div>
      <h3 className="font-display font-semibold text-sm text-[var(--color-text)] flex-1">
        {label}
      </h3>
      <span className={`font-mono text-xs px-2 py-0.5 rounded-full border
        ${isHierarchy
          ? 'text-gold bg-gold/10 border-gold/30'
          : 'text-teal bg-teal/10 border-teal/30'}`}>
        {count} term{count !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

// ── Confidence column header ──────────────────────────────────
function ColumnHeaders() {
  return (
    <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg
      bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
      <span className="font-mono text-[10px] text-[var(--color-text-muted)] w-24 flex-shrink-0">
        GO Term
      </span>
      <span className="font-mono text-[10px] text-[var(--color-text-muted)] w-10 flex-shrink-0">
        NS
      </span>
      <span className="font-mono text-[10px] text-[var(--color-text-muted)] flex-1">
        Function Name
      </span>
      <span className="font-mono text-[10px] text-[var(--color-text-muted)] w-48 flex-shrink-0 text-right">
        Confidence Level ↓
      </span>
    </div>
  )
}

// ── Show more button ──────────────────────────────────────────
function ShowMoreButton({ shown, total, onShow, onCollapse }) {
  const remaining = total - shown
  if (total <= PAGE_SIZE) return null

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      {shown < total && (
        <motion.button
          onClick={onShow}
          className="flex items-center gap-2 px-4 py-2 rounded-full
            border border-teal/30 bg-teal/5 text-teal text-xs
            font-display font-semibold hover:bg-teal/10
            transition-colors duration-200 cursor-pointer"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <ChevronDown size={14} />
          Show {Math.min(remaining, PAGE_SIZE)} more
          <span className="text-teal/60">({remaining} remaining)</span>
        </motion.button>
      )}
      {shown > PAGE_SIZE && (
        <motion.button
          onClick={onCollapse}
          className="flex items-center gap-2 px-4 py-2 rounded-full
            border border-[var(--color-border)] text-[var(--color-text-muted)]
            text-xs font-display font-semibold hover:border-teal/30
            hover:text-teal transition-colors duration-200 cursor-pointer"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <ChevronUp size={14} />
          Collapse
        </motion.button>
      )}
    </div>
  )
}

// ── Main ResultsPanel ─────────────────────────────────────────
export default function ResultsPanel({ results, totalPredictions }) {
  const [nsFilter,       setNsFilter]       = useState('All')
  const [aiShown,        setAiShown]        = useState(PAGE_SIZE)
  const [hierarchyShown, setHierarchyShown] = useState(PAGE_SIZE)

  const safeResults = Array.isArray(results) ? results : []

  const sorted = useMemo(() => sortResults(safeResults), [safeResults])

  const filtered = useMemo(() => {
    if (nsFilter === 'All') return sorted
    const full = NAMESPACE_MAP[nsFilter]
    return sorted.filter(r => r.namespace === full)
  }, [sorted, nsFilter])

  const aiResults = filtered.filter(r =>
  r.predicted_by === 'Neural Network AI' ||
  r.predicted_by === 'Neural Network'
)
const hierarchyResults = filtered.filter(r =>
  r.predicted_by?.startsWith('Hierarchy') ||
  r.predicted_by === 'Hierarchy Tree Rule'
)

const totalAI = safeResults.filter(r =>
  r.predicted_by === 'Neural Network AI' ||
  r.predicted_by === 'Neural Network'
).length
const totalHierarchy = safeResults.filter(r =>
  r.predicted_by?.startsWith('Hierarchy') ||
  r.predicted_by === 'Hierarchy Tree Rule'
).length

  // Reset pagination when filter changes
  const handleNsChange = (ns) => {
    setNsFilter(ns)
    setAiShown(PAGE_SIZE)
    setHierarchyShown(PAGE_SIZE)
  }

  return (
    <div className="space-y-6">

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg text-[var(--color-text)]">
            Prediction Results
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
  {totalPredictions ?? safeResults.length} GO terms predicted
  <span className="mx-1.5 opacity-40"></span>
  
  <span className="mx-1.5 opacity-40"></span>
   
</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <NamespaceFilter active={nsFilter} onChange={handleNsChange} />
          <ConfidenceLegend />

          {/* Download buttons */}
          <motion.button
            onClick={() => downloadCSV(safeResults, 'neuralprot-results.csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
              border border-[var(--color-border)] text-xs font-display
              text-[var(--color-text-muted)] hover:text-teal hover:border-teal/40
              transition-colors duration-200 cursor-pointer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Download size={12} />
            CSV
          </motion.button>

          <motion.button
            onClick={() => downloadJSON(safeResults, 'neuralprot-results.json')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
              border border-[var(--color-border)] text-xs font-display
              text-[var(--color-text-muted)] hover:text-teal hover:border-teal/40
              transition-colors duration-200 cursor-pointer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Download size={12} />
            JSON
          </motion.button>
        </div>
      </div>

      {/* Panel 1 — AI Predictions */}
      {aiResults.length > 0 && (
        <div className="glass-card rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
          <PanelHeader
            icon={Brain}
            label="Neural Network Predictions"
            count={aiResults.length}
            isHierarchy={false}
          />
          <ColumnHeaders />
          <div className="space-y-2 pt-1">
            {aiResults.slice(0, aiShown).map((result, i) => (
              <GOTermCard
                key={result.go_term || result.go_id || i}
                result={result}
                index={i}
              />
            ))}
          </div>
          <ShowMoreButton
            shown={aiShown}
            total={aiResults.length}
            onShow={() => setAiShown(n => Math.min(n + PAGE_SIZE, aiResults.length))}
            onCollapse={() => setAiShown(PAGE_SIZE)}
          />
        </div>
      )}

      {/* Panel 2 — Hierarchy Rules */}
      {hierarchyResults.length > 0 && (
        <div className="rounded-2xl border border-gold/20 bg-gold/[0.02] p-5 space-y-3">
          <PanelHeader
            icon={GitBranch}
            label="Biological Hierarchy Laws"
            count={hierarchyResults.length}
            isHierarchy={true}
          />
          <ColumnHeaders />
          <div className="space-y-2 pt-1">
            {hierarchyResults.slice(0, hierarchyShown).map((result, i) => (
              <GOTermCard
                key={result.go_term || result.go_id || i}
                result={result}
                index={i}
              />
            ))}
          </div>
          <ShowMoreButton
            shown={hierarchyShown}
            total={hierarchyResults.length}
            onShow={() => setHierarchyShown(n => Math.min(n + PAGE_SIZE, hierarchyResults.length))}
            onCollapse={() => setHierarchyShown(PAGE_SIZE)}
          />
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16
          text-[var(--color-text-muted)]">
          <p className="font-display font-semibold text-sm mb-1">
            No results for this namespace
          </p>
          <p className="text-xs font-body">
            Try switching the filter to All
          </p>
        </div>
      )}
    </div>
  )
}