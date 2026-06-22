import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { GitCompare, Brain, Download, ChevronDown, ChevronUp } from 'lucide-react'
import ConfidenceBar from '../components/ui/ConfidenceBar'
import NamespaceFilter from '../components/ui/NamespaceFilter'
import { getQuickGOLink } from '../utils/goTermLink'

const PAGE_SIZE = 50

const NAMESPACE_MAP = {
  BP: 'biological_process',
  MF: 'molecular_function',
  CC: 'cellular_component',
}

// ── Download helpers ──────────────────────────────────────────
function downloadCSV(data, filename) {
  const headers = ['go_term', 'go_name', 'namespace', 'confidence_a', 'confidence_b', 'type']
  const rows = data.map(r => [
    r.go_term || '',
    r.go_name || r.name || r.group || '',
    r.namespace || '',
    r.scoreA?.toFixed(4) ?? '',
    r.scoreB?.toFixed(4) ?? '',
    r.type || '',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Fetch predictions for one sequence ───────────────────────
async function fetchPredictions(sequence) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/predict/sequence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error: ${res.status}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : data.predictions ?? []
}

// ── Fetch GO dictionary once ─────────────────────────────────
async function fetchGoDict() {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/go_dict`)
  if (!res.ok) throw new Error('Failed to load GO dictionary')
  return res.json()
}

// ── Namespace badge ───────────────────────────────────────────
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border flex-shrink-0 ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  )
}

// ── Shared function row ───────────────────────────────────────
function SharedRow({ item, index }) {
  const shouldReduce = useReducedMotion()
  const goUrl = getQuickGOLink(item.go_term)

  return (
    <motion.div
      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-teal/30 transition-all duration-200"
      initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.3 }}
    >
      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-36">
        <a href={goUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs font-semibold text-teal hover:text-cyan transition-colors duration-150">
          {item.go_term}
        </a>
        <NamespaceBadge namespace={item.namespace} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm text-[var(--color-text)] font-body truncate">
          {item.go_name || item.name || item.group || 'Unknown'}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 w-full sm:w-64 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-teal w-4 flex-shrink-0">A</span>
          <ConfidenceBar score={item.scoreA} showLabel={true} height="h-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-violet w-4 flex-shrink-0">B</span>
          <ConfidenceBar score={item.scoreB} showLabel={true} height="h-1.5" />
        </div>
      </div>
    </motion.div>
  )
}

// ── Unique function row ───────────────────────────────────────
function UniqueRow({ item, index, color }) {
  const shouldReduce = useReducedMotion()
  const goUrl = getQuickGOLink(item.go_term)
  const score = item.confidence ?? 0
  const colors = {
    teal: 'border-teal/20 bg-teal/5 hover:border-teal/40',
    violet: 'border-violet/20 bg-violet/5 hover:border-violet/40',
  }

  return (
    <motion.div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-200 ${colors[color]}`}
      initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.3 }}
    >
      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-36">
        <a href={goUrl} target="_blank" rel="noopener noreferrer" className={`font-mono text-xs font-semibold transition-colors duration-150 ${color === 'teal' ? 'text-teal hover:text-cyan' : 'text-violet hover:text-violet/70'}`}>
          {item.go_term}
        </a>
        <NamespaceBadge namespace={item.namespace} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm text-[var(--color-text)] font-body truncate">
          {item.go_name || item.name || item.group || 'Unknown'}
        </p>
      </div>
      <div className="w-full sm:w-48 flex-shrink-0">
        <ConfidenceBar score={score} showLabel={true} height="h-1.5" />
      </div>
    </motion.div>
  )
}

// ── Show more button ──────────────────────────────────────────
function ShowMoreButton({ shown, total, onShow, onCollapse }) {
  if (total <= PAGE_SIZE) return null
  const remaining = total - shown
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      {shown < total && (
        <motion.button onClick={onShow} className="flex items-center gap-2 px-4 py-2 rounded-full border border-teal/30 bg-teal/5 text-teal text-xs font-display font-semibold hover:bg-teal/10 transition-colors duration-200 cursor-pointer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          <ChevronDown size={14} /> Show {Math.min(remaining, PAGE_SIZE)} more <span className="text-teal/60">({remaining} remaining)</span>
        </motion.button>
      )}
      {shown > PAGE_SIZE && (
        <motion.button onClick={onCollapse} className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-display font-semibold hover:border-teal/30 hover:text-teal transition-colors duration-200 cursor-pointer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          <ChevronUp size={14} /> Collapse
        </motion.button>
      )}
    </div>
  )
}

// ── Protein input side ────────────────────────────────────────
function ProteinInputSide({ label, color, sequence, onSequenceChange, disabled }) {
  const colorStyles = {
    teal: { border: 'border-teal/30', label: 'text-teal', dot: 'bg-teal' },
    violet: { border: 'border-violet/30', label: 'text-violet', dot: 'bg-violet' },
  }
  const c = colorStyles[color]

  return (
    <div className={`glass-card rounded-2xl border ${c.border} p-5 space-y-4 flex-1`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span className={`font-display font-bold text-sm ${c.label}`}>{label}</span>
      </div>
      <div className={`rounded-xl border-2 transition-colors duration-300 overflow-hidden ${sequence ? c.border : 'border-[var(--color-border)]'}`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-muted)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            <span className="ml-2 text-xs font-mono text-[var(--color-text-muted)]">{label.toLowerCase().replace(' ', '_')}</span>
          </div>
          <span className="text-xs font-mono text-[var(--color-text-muted)]">{sequence.replace(/\s/g, '').length} aa</span>
        </div>
        <textarea
          value={sequence}
          onChange={e => onSequenceChange(e.target.value)}
          disabled={disabled}
          placeholder={`Paste ${label} sequence here...\n\nExample: MENFQKVEKIGE...`}
          className="w-full h-40 px-4 py-4 font-mono text-xs resize-none outline-none bg-[var(--color-card)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 leading-relaxed tracking-wide disabled:opacity-50"
          spellCheck={false} autoCorrect="off" autoCapitalize="off"
        />
      </div>
    </div>
  )
}

// ── Results component with depth + blacklist filtering ────────
function CompareResultsWithFilter({ resultsA, resultsB, seqLabelA, seqLabelB, goDict }) {
  const [activeTab, setActiveTab] = useState('shared')
  const [nsFilter, setNsFilter] = useState('All')
  const [shownShared, setShownShared] = useState(PAGE_SIZE)
  const [shownOnlyA, setShownOnlyA] = useState(PAGE_SIZE)
  const [shownOnlyB, setShownOnlyB] = useState(PAGE_SIZE)

  const MIN_DEPTH = 5                    // exclude terms with <5 ancestors
  const MIN_COMPARE_CONFIDENCE = 0.85    // only keep high confidence

// Blacklist of ONLY truly broad GO terms (ancestors <= 5)
// Verified against go_dict.json ancestor counts
const BROAD_TERMS = new Set([
  // Depth 3 — extremely broad, near root
  'GO:0016746', // acyltransferase activity
  'GO:0006952', // defense response
  'GO:0008092', // cytoskeletal protein binding
  'GO:0019899', // enzyme binding
  'GO:0045202', // synapse
  'GO:0005102', // signaling receptor binding
  'GO:0005543', // phospholipid binding
  'GO:1990234', // transferase complex
  'GO:0009058', // biosynthetic process
  'GO:0033993', // response to lipid
  'GO:0009888', // tissue development
  'GO:0016477', // cell migration
  'GO:0019904', // protein domain specific binding
  'GO:0003012', // muscle system process
  'GO:0098797', // plasma membrane protein complex
  'GO:0048598', // embryonic morphogenesis
  'GO:0035239', // tube morphogenesis
  'GO:0010038', // response to metal ion
  'GO:0098609', // cell-cell adhesion
  'GO:0050878', // regulation of body fluid levels
  'GO:0016854', // racemase and epimerase activity
  'GO:1904949', // ATPase complex
  'GO:0009308', // amine metabolic process
  'GO:0001775', // cell activation
  'GO:0016830', // carbon-carbon lyase activity

  // Depth 4 — still very broad
  'GO:0016779', // nucleotidyltransferase activity
  'GO:0019900', // kinase binding
  'GO:0043005', // neuron projection
  'GO:0004857', // enzyme inhibitor activity
  'GO:0005975', // carbohydrate metabolic process
  'GO:0006915', // apoptotic process
  'GO:0019222', // regulation of metabolic process
  'GO:0008047', // enzyme activator activity
  'GO:0016758', // hexosyltransferase activity
  'GO:0061024', // membrane organization
  'GO:0006629', // lipid metabolic process
  'GO:0030154', // cell differentiation
  'GO:0002009', // morphogenesis of an epithelium
  'GO:0006996', // organelle organization
  'GO:0016301', // kinase activity
  'GO:0008233', // peptidase activity
  'GO:0099512', // supramolecular fiber
  'GO:0030030', // cell projection organization
  'GO:0005911', // cell-cell junction
  'GO:0009725', // response to hormone
  'GO:0009416', // response to light stimulus
  'GO:0007600', // sensory perception
  'GO:0031253', // cell projection membrane
  'GO:0030155', // regulation of cell adhesion
  'GO:0042594', // response to starvation
  'GO:0005126', // cytokine receptor binding
  'GO:0008483', // transaminase activity
  'GO:0006396', // RNA processing
  'GO:0060429', // epithelium development
  'GO:0050890', // cognition
  'GO:0016831', // carboxy-lyase activity
  'GO:0016763', // pentosyltransferase activity
  'GO:0004659', // prenyltransferase activity
  'GO:0006869', // lipid transport

  // Depth 5 — borderline broad, keeping only the most general ones
  'GO:0007165', // signal transduction
  'GO:0016462', // pyrophosphatase activity
  'GO:0046872', // metal ion binding
  'GO:0055085', // transmembrane transport
  'GO:0048468', // cell development
  'GO:0016791', // phosphatase activity
  'GO:0030182', // neuron differentiation
  'GO:0007010', // cytoskeleton organization
  'GO:0048018', // receptor ligand activity
])

  const { shared, onlyA, onlyB } = useMemo(() => {
    const aiOnlyA = resultsA.filter(r =>
      (r.predicted_by === 'Neural Network AI' || r.predicted_by === 'Neural Network') &&
      (r.confidence ?? 0) >= MIN_COMPARE_CONFIDENCE
    )
    const aiOnlyB = resultsB.filter(r =>
      (r.predicted_by === 'Neural Network AI' || r.predicted_by === 'Neural Network') &&
      (r.confidence ?? 0) >= MIN_COMPARE_CONFIDENCE
    )

    const mapA = Object.fromEntries(aiOnlyA.map(r => [r.go_term, r]))
    const mapB = Object.fromEntries(aiOnlyB.map(r => [r.go_term, r]))

    const allTerms = new Set([...aiOnlyA.map(r => r.go_term), ...aiOnlyB.map(r => r.go_term)])

    const sharedTemp = []
    const onlyATemp = []
    const onlyBTemp = []

    for (const term of allTerms) {
      const a = mapA[term]
      const b = mapB[term]
      const depth = goDict[term]?.ancestors?.length ?? 0
      const isBroad = BROAD_TERMS.has(term)

      if (a && b) {
        if (depth >= MIN_DEPTH && !isBroad) {
          sharedTemp.push({
            ...a,
            go_name: a.go_name || a.name || a.group,
            scoreA: a.confidence,
            scoreB: b.confidence,
            type: 'shared',
          })
        }
      } else if (a) {
        onlyATemp.push({ ...a, type: 'only_a' })
      } else if (b) {
        onlyBTemp.push({ ...b, type: 'only_b' })
      }
    }

    sharedTemp.sort((a, b) => ((b.scoreA + b.scoreB) / 2) - ((a.scoreA + a.scoreB) / 2))
    onlyATemp.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    onlyBTemp.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))

    return { shared: sharedTemp, onlyA: onlyATemp, onlyB: onlyBTemp }
  }, [resultsA, resultsB, goDict])

  const filterNs = (arr) => {
    if (nsFilter === 'All') return arr
    const full = NAMESPACE_MAP[nsFilter]
    return arr.filter(r => r.namespace === full)
  }

  const filteredShared = filterNs(shared)
  const filteredOnlyA = filterNs(onlyA)
  const filteredOnlyB = filterNs(onlyB)

  const handleNsChange = (ns) => {
    setNsFilter(ns)
    setShownShared(PAGE_SIZE)
    setShownOnlyA(PAGE_SIZE)
    setShownOnlyB(PAGE_SIZE)
  }

  const tabs = [
    { key: 'shared', label: 'Shared Functions', count: filteredShared.length, color: 'teal' },
    { key: 'onlyA', label: seqLabelA, count: filteredOnlyA.length, color: 'teal' },
    { key: 'onlyB', label: seqLabelB, count: filteredOnlyB.length, color: 'violet' },
  ]

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Shared Functions', value: filteredShared.length, color: 'text-teal' },
          { label: 'Unique to Protein A', value: filteredOnlyA.length, color: 'text-teal' },
          { label: 'Unique to Protein B', value: filteredOnlyB.length, color: 'text-violet' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl border border-[var(--color-border)] p-4 text-center">
            <p className={`font-mono font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[var(--color-text-muted)] font-body mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-muted)]">
        <Brain size={14} className="text-teal flex-shrink-0 mt-0.5" />
        <p className="text-xs font-body text-[var(--color-text-muted)] leading-relaxed">
          Comparison uses only <span className="text-teal font-semibold">Neural Network AI predictions</span> with confidence ≥ {MIN_COMPARE_CONFIDENCE}.
          Very general GO terms (depth &lt; {MIN_DEPTH} or manually excluded) are removed from shared functions to highlight meaningful similarities.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-semibold border transition-all duration-200 cursor-pointer ${activeTab === tab.key ? (tab.color === 'violet' ? 'bg-violet/10 border-violet/30 text-violet' : 'bg-teal/10 border-teal/30 text-teal') : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === tab.key ? (tab.color === 'violet' ? 'bg-violet/20' : 'bg-teal/20') : 'bg-[var(--color-bg-muted)]'}`}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <NamespaceFilter active={nsFilter} onChange={handleNsChange} />
          <motion.button onClick={() => { const data = activeTab === 'shared' ? filteredShared : activeTab === 'onlyA' ? filteredOnlyA : filteredOnlyB; downloadCSV(data, `neuralprot-compare-${activeTab}.csv`) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-border)] text-xs font-display text-[var(--color-text-muted)] hover:text-teal hover:border-teal/40 transition-colors duration-200 cursor-pointer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Download size={12} /> CSV
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'shared' && (
          <motion.div key="shared" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-2">
            <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Confidence comparison:</span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-teal"><span className="w-3 h-1.5 rounded-full bg-teal inline-block" /> Protein A</span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-violet"><span className="w-3 h-1.5 rounded-full bg-violet inline-block" /> Protein B</span>
            </div>
            {filteredShared.slice(0, shownShared).map((item, i) => <SharedRow key={item.go_term || i} item={item} index={i} />)}
            {filteredShared.length === 0 && <p className="text-center text-[var(--color-text-muted)] text-sm py-12 font-body">No shared functions meeting the specificity and confidence criteria.</p>}
            <ShowMoreButton shown={shownShared} total={filteredShared.length} onShow={() => setShownShared(n => Math.min(n + PAGE_SIZE, filteredShared.length))} onCollapse={() => setShownShared(PAGE_SIZE)} />
          </motion.div>
        )}
        {activeTab === 'onlyA' && (
          <motion.div key="onlyA" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-2">
            {filteredOnlyA.slice(0, shownOnlyA).map((item, i) => <UniqueRow key={item.go_term || i} item={item} index={i} color="teal" />)}
            {filteredOnlyA.length === 0 && <p className="text-center text-[var(--color-text-muted)] text-sm py-12 font-body">No unique functions for this namespace.</p>}
            <ShowMoreButton shown={shownOnlyA} total={filteredOnlyA.length} onShow={() => setShownOnlyA(n => Math.min(n + PAGE_SIZE, filteredOnlyA.length))} onCollapse={() => setShownOnlyA(PAGE_SIZE)} />
          </motion.div>
        )}
        {activeTab === 'onlyB' && (
          <motion.div key="onlyB" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-2">
            {filteredOnlyB.slice(0, shownOnlyB).map((item, i) => <UniqueRow key={item.go_term || i} item={item} index={i} color="violet" />)}
            {filteredOnlyB.length === 0 && <p className="text-center text-[var(--color-text-muted)] text-sm py-12 font-body">No unique functions for this namespace.</p>}
            <ShowMoreButton shown={shownOnlyB} total={filteredOnlyB.length} onShow={() => setShownOnlyB(n => Math.min(n + PAGE_SIZE, filteredOnlyB.length))} onCollapse={() => setShownOnlyB(PAGE_SIZE)} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Compare page ─────────────────────────────────────────
export default function Compare() {
  const shouldReduce = useReducedMotion()
  const [seqA, setSeqA] = useState('')
  const [seqB, setSeqB] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [goDict, setGoDict] = useState(null)

  useEffect(() => {
    fetchGoDict().then(setGoDict).catch(console.error)
  }, [])

  const canCompare = seqA.trim().length > 0 && seqB.trim().length > 0 && !loading && goDict

  const handleCompare = async () => {
    if (!canCompare) return
    setLoading(true)
    setResults(null)
    setError(null)
    try {
      const [predA, predB] = await Promise.all([
        fetchPredictions(seqA.toUpperCase().replace(/\s/g, '')),
        fetchPredictions(seqB.toUpperCase().replace(/\s/g, '')),
      ])
      setResults({ predA, predB })
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your API connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <motion.div className="text-center" initial={shouldReduce ? {} : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal/30 bg-teal/5 mb-4">
            <GitCompare size={12} className="text-teal" />
            <span className="text-[10px] font-mono text-teal tracking-widest uppercase">Comparative Analytics</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[var(--color-text)] mb-2">Compare Two Proteins</h1>
          <p className="text-[var(--color-text-muted)] text-sm font-body max-w-lg mx-auto">Run predictions on two sequences simultaneously and identify shared functions, unique capabilities, and confidence differences.</p>
        </motion.div>

        {/* Input area */}
        <motion.div className="space-y-4" initial={shouldReduce ? {} : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <div className="flex flex-col lg:flex-row gap-4">
            <ProteinInputSide label="Protein A" color="teal" sequence={seqA} onSequenceChange={setSeqA} disabled={loading} />
            <div className="flex lg:flex-col items-center justify-center gap-2 py-2 lg:py-0">
              <div className="h-px lg:h-full lg:w-px w-full bg-[var(--color-border)]" />
              <div className="flex-shrink-0 w-8 h-8 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-center">
                <GitCompare size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div className="h-px lg:h-full lg:w-px w-full bg-[var(--color-border)]" />
            </div>
            <ProteinInputSide label="Protein B" color="violet" sequence={seqB} onSequenceChange={setSeqB} disabled={loading} />
          </div>
          <div className="flex justify-center">
            <motion.button onClick={handleCompare} disabled={!canCompare} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-full font-display font-semibold text-sm transition-all duration-200 ${canCompare ? 'bg-teal text-[#0A0F1E] shadow-teal-glow hover:bg-teal-light cursor-pointer' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] cursor-not-allowed'}`} whileHover={canCompare ? { scale: 1.04 } : {}} whileTap={canCompare ? { scale: 0.97 } : {}}>
              <GitCompare size={16} /> Compare Proteins
            </motion.button>
          </div>
        </motion.div>

        {/* Loading / Error / Results */}
        <AnimatePresence>
          {loading && (
            <motion.div className="space-y-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card rounded-2xl border border-teal/20 p-5"><p className="text-xs font-mono text-teal mb-3">Processing Protein A...</p><div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-[var(--color-bg-muted)] animate-pulse" />)}</div></div>
                <div className="glass-card rounded-2xl border border-violet/20 p-5"><p className="text-xs font-mono text-violet mb-3">Processing Protein B...</p><div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-[var(--color-bg-muted)] animate-pulse" />)}</div></div>
              </div>
            </motion.div>
          )}
          {error && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/5">
              <p className="text-rose-400 text-xs font-mono leading-relaxed">{error}</p>
            </motion.div>
          )}
{results && !loading && goDict && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              {/* Explanation banner */}
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-teal/20 bg-teal/5">
                <Brain size={14} className="text-teal mt-0.5 flex-shrink-0" />
                <p className="text-xs font-body text-[var(--color-text-muted)] leading-relaxed">
                  <span className="text-teal font-semibold">Compare view shows fewer results than Predict.</span>{' '}
                  Very broad GO terms (such as "cytoplasm" or "biosynthetic process") are filtered out here
                  so the comparison focuses on specific, meaningful differences between proteins.
                  Visit the <span className="text-[var(--color-text)]">Predict page</span> to see the full unfiltered list for each protein.
                </p>
              </div>

              <CompareResultsWithFilter
                resultsA={results.predA}
                resultsB={results.predB}
                seqLabelA="Only in Protein A"
                seqLabelB="Only in Protein B"
                goDict={goDict}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}