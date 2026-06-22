import { useState, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Upload, CheckCircle, FlaskConical, BarChart3, Download, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// ── File drop zone ────────────────────────────────────────────
function FileZone({ label, description, accept, file, onChange, color }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)

  const colors = {
    teal:   { border: 'border-teal/40',   active: 'border-teal bg-teal/5',     icon: 'text-teal',   badge: 'bg-teal/10 text-teal border-teal/30'   },
    cyan:   { border: 'border-cyan/40',   active: 'border-cyan bg-cyan/5',     icon: 'text-cyan',   badge: 'bg-cyan/10 text-cyan border-cyan/30'   },
    violet: { border: 'border-violet/40', active: 'border-violet bg-violet/5', icon: 'text-violet', badge: 'bg-violet/10 text-violet border-violet/30' },
  }
  const c = colors[color] || colors.teal

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${c.badge}`}>
          {label}
        </span>
      </div>
      <motion.div
        className={`relative rounded-xl border-2 border-dashed transition-colors duration-200 cursor-pointer
          ${file ? c.active : dragging ? c.active : `${c.border} hover:${c.active}`}
          bg-[var(--color-card)]`}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onChange(f) }}
        whileHover={{ scale: 1.005 }}
        animate={dragging ? { scale: 1.02 } : { scale: 1 }}
      >
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files[0])}
        />
        <div className="flex flex-col items-center justify-center gap-2 py-8 px-4">
          {file ? (
            <>
              <CheckCircle size={24} className={c.icon} />
              <p className={`font-display font-semibold text-sm ${c.icon} text-center break-all`}>
                {file.name}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] font-body">
                {(file.size / 1024).toFixed(1)} KB — Click to replace
              </p>
            </>
          ) : (
            <>
              <Upload size={22} className="text-[var(--color-text-muted)]" />
              <p className="font-display font-semibold text-sm text-[var(--color-text)]">
                Drop or click to upload
              </p>
              <p className="text-xs text-[var(--color-text-muted)] font-mono text-center">
                {accept}
              </p>
            </>
          )}
        </div>
      </motion.div>
      <p className="text-xs text-[var(--color-text-muted)] font-body leading-relaxed">
        {description}
      </p>
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────
function MetricCard({ label, value, sub, color, icon: Icon }) {
  return (
    <motion.div
      className="glass-card rounded-2xl border border-[var(--color-border)] p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-muted)] border border-[var(--color-border)]
          flex items-center justify-center mb-3">
          <Icon size={15} className={color || 'text-teal'} />
        </div>
      )}
      <p className="text-xs font-display font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
        {label}
      </p>
      <p className={`font-mono font-bold text-3xl mb-1 ${color || 'text-[var(--color-text)]'}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-[var(--color-text-muted)] font-body">{sub}</p>
      )}
    </motion.div>
  )
}

// ── Custom recharts tooltip ───────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-xl border border-[var(--color-border)] p-3 text-xs">
      <p className="font-display font-semibold text-[var(--color-text)] mb-2 truncate max-w-48">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.fill }} />
          <span className="text-[var(--color-text-muted)]">{entry.name}:</span>
          <span className="font-mono font-semibold text-[var(--color-text)]">
            {entry.value.toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Per-group table ───────────────────────────────────────────
function GroupTable({ groups }) {
  const [showAll, setShowAll] = useState(false)
  const sorted = Object.entries(groups)
    .sort((a, b) => b[1].NeuralProt.fmax - a[1].NeuralProt.fmax)

  const visible = showAll ? sorted : sorted.slice(0, 10)

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      {/* Header */}
      <div className="hidden sm:grid px-4 py-2.5 bg-[var(--color-bg-muted)]
        border-b border-[var(--color-border)]
        text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider"
        style={{ gridTemplateColumns: '1fr 72px 72px 64px 72px 72px 64px' }}>
        <span>Group</span>
        <span className="text-right">NP Fmax</span>
        <span className="text-right">BL Fmax</span>
        <span className="text-center">Gain</span>
        <span className="text-right">NP Smin</span>
        <span className="text-right">BL Smin</span>
        <span className="text-center">Smin ↓</span>
      </div>

      {visible.map(([group, r]) => {
        const gain    = r.fmax_gain_over_baseline ?? (r.NeuralProt.fmax - r.baseline.fmax)
        const sminImp = r.smin_improvement       ?? (r.baseline.smin  - r.NeuralProt.smin)
        const beats   = gain > 0

        return (
          <div
            key={group}
            className="flex flex-col sm:grid gap-2 px-4 py-3
              border-b border-[var(--color-border)] text-sm
              hover:bg-[var(--color-bg-muted)] transition-colors duration-150"
            style={{ gridTemplateColumns: '1fr 72px 72px 64px 72px 72px 64px' }}
          >
            <span className="font-body text-[var(--color-text)] text-xs leading-snug break-words">
              {group.replace(/_/g, ' ')}
            </span>

            <span className={`font-mono text-xs text-right font-semibold
              ${beats ? 'text-teal' : 'text-[var(--color-text)]'}`}>
              {r.NeuralProt.fmax.toFixed(3)}
            </span>
            <span className="font-mono text-xs text-right text-[var(--color-text-muted)]">
              {r.baseline.fmax.toFixed(3)}
            </span>
            <div className="flex justify-center">
              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded
                ${beats
                  ? 'bg-teal/10 text-teal'
                  : 'bg-rose-500/10 text-rose-400'}`}>
                {gain >= 0 ? '+' : ''}{gain.toFixed(3)}
              </span>
            </div>

            <span className="font-mono text-xs text-right text-[var(--color-text-muted)]">
              {r.NeuralProt.smin.toFixed(3)}
            </span>
            <span className="font-mono text-xs text-right text-[var(--color-text-muted)]">
              {r.baseline.smin.toFixed(3)}
            </span>
            <div className="flex justify-center">
              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded
                ${sminImp > 0
                  ? 'bg-teal/10 text-teal'
                  : 'bg-rose-500/10 text-rose-400'}`}>
                {sminImp >= 0 ? '+' : ''}{sminImp.toFixed(3)}
              </span>
            </div>
          </div>
        )
      })}

      {sorted.length > 10 && (
        <div className="flex justify-center p-3 bg-[var(--color-bg-muted)]">
          <button
            onClick={() => setShowAll(s => !s)}
            className="flex items-center gap-1.5 text-xs font-display font-semibold
              text-teal hover:text-cyan transition-colors duration-150 cursor-pointer"
          >
            {showAll
              ? <><ChevronUp size={13} /> Show less</>
              : <><ChevronDown size={13} /> Show {sorted.length - 10} more groups</>
            }
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Evaluate page ────────────────────────────────────────
export default function Evaluate() {
  const shouldReduce = useReducedMotion()
  const [fastaFile,  setFastaFile]  = useState(null)
  const [testTsv,    setTestTsv]    = useState(null)
  const [trainTsv,   setTrainTsv]   = useState(null)
  const [propagate,  setPropagate]  = useState(true)
  const [status,     setStatus]     = useState('idle') // idle | loading | done | error
  const [results,    setResults]    = useState(null)
  const [errorMsg,   setErrorMsg]   = useState('')

  const allUploaded = fastaFile && testTsv && trainTsv

  async function runEvaluation() {
    if (!allUploaded) return
    setStatus('loading')
    setResults(null)
    setErrorMsg('')

    const form = new FormData()
    form.append('fasta_file',  fastaFile)
    form.append('test_tsv',    testTsv)
    form.append('train_tsv',   trainTsv)
    form.append('propagate',   propagate)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/fmax`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error: ${res.status}`)
      }
      const data = await res.json()
      setResults(data)
      setStatus('done')
    } catch (e) {
      setErrorMsg(e.message || 'Evaluation failed. Is the backend running?')
      setStatus('error')
    }
  }

  function downloadResults() {
    if (!results) return
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'neuralprot-evaluation.json'; a.click()
    URL.revokeObjectURL(url)
  }

  // Derived chart data
  const groupEntries   = results ? Object.entries(results.group_results || {}) : []
  const fmaxChartData  = groupEntries
    .sort((a, b) => b[1].NeuralProt.fmax - a[1].NeuralProt.fmax)
    .slice(0, 20)
    .map(([group, r]) => ({
      name:       group.replace(/_GO_\w+$/, '').replace(/_/g, ' ').slice(0, 28),
      NeuralProt: parseFloat(r.NeuralProt.fmax.toFixed(3)),
      Baseline:   parseFloat(r.baseline.fmax.toFixed(3)),
    }))

  const sminChartData = groupEntries
    .sort((a, b) => a[1].NeuralProt.smin - b[1].NeuralProt.smin)
    .slice(0, 20)
    .map(([group, r]) => ({
      name:       group.replace(/_GO_\w+$/, '').replace(/_/g, ' ').slice(0, 28),
      NeuralProt: parseFloat(r.NeuralProt.smin.toFixed(3)),
      Baseline:   parseFloat(r.baseline.smin.toFixed(3)),
    }))

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header */}
        <motion.div
          className="text-center"
          initial={shouldReduce ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
            border border-teal/30 bg-teal/5 mb-4">
            <FlaskConical size={12} className="text-teal" />
            <span className="text-[10px] font-mono text-teal tracking-widest uppercase">
              Academic Validation Desk
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[var(--color-text)] mb-2">
            Evaluate Model Performance
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm font-body max-w-lg mx-auto leading-relaxed">
            Compute CAFA-standard Fmax and Smin metrics against a held-out test set.
            Compares NeuralProt against a frequency baseline automatically.
          </p>
        </motion.div>

        {/* Notice */}
        <motion.div
          className="flex items-start gap-3 px-4 py-3.5 rounded-xl
            border border-amber-400/30 bg-amber-400/5"
          initial={shouldReduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-body text-amber-300 leading-relaxed">
            Use only on a held-out test set, not the training data. Evaluating on training
            data will produce inflated metrics that do not reflect real-world performance.
          </p>
        </motion.div>

        {/* Upload card */}
        <motion.div
          className="glass-card rounded-2xl border border-[var(--color-border)] p-6"
          initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <p className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider mb-5">
            Upload evaluation files
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            <FileZone
              label="Test sequences"
              description="FASTA file of test proteins. IDs must match the TSV."
              accept=".fasta,.fa"
              file={fastaFile}
              onChange={setFastaFile}
              color="teal"
            />
            <FileZone
              label="Test annotations"
              description="TSV with GO term annotations for the test proteins (Answer Key)."
              accept=".tsv,.txt"
              file={testTsv}
              onChange={setTestTsv}
              color="cyan"
            />
            <FileZone
              label="Training annotations"
              description="TSV with GO term annotations from training data. Used to compute frequency baseline."
              accept=".tsv,.txt"
              file={trainTsv}
              onChange={setTrainTsv}
              color="violet"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center
            justify-between gap-4 pt-4 border-t border-[var(--color-border)]">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={propagate}
                onChange={e => setPropagate(e.target.checked)}
                className="w-4 h-4 rounded accent-teal cursor-pointer"
              />
              <span className="text-sm font-body text-[var(--color-text)] group-hover:text-teal
                transition-colors duration-150">
                Apply GO True Path Rule propagation
              </span>
            </label>

            <motion.button
              onClick={runEvaluation}
              disabled={!allUploaded || status === 'loading'}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl
                font-display font-semibold text-sm transition-all duration-200
                ${allUploaded && status !== 'loading'
                  ? 'bg-teal text-[#0A0F1E] shadow-teal-glow hover:bg-teal-light cursor-pointer'
                  : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] cursor-not-allowed'
                }`}
              whileHover={allUploaded ? { scale: 1.03 } : {}}
              whileTap={allUploaded ? { scale: 0.97 } : {}}
            >
              <BarChart3 size={15} />
              {status === 'loading' ? 'Evaluating…' : 'Launch Evaluation Engine'}
            </motion.button>
          </div>

          <AnimatePresence>
            {(status === 'error') && (
              <motion.div
                className="mt-4 flex items-start gap-2 p-3 rounded-lg
                  border border-rose-500/30 bg-rose-500/5"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-xs font-mono text-rose-400">{errorMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Loading state */}
        <AnimatePresence>
          {status === 'loading' && (
            <motion.div
              className="glass-card rounded-2xl border border-[var(--color-border)] p-10
                flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-10 h-10 rounded-full border-2 border-[var(--color-border)]
                border-t-teal animate-spin" />
              <p className="font-display font-semibold text-sm text-[var(--color-text)]">
                Running evaluation engine…
              </p>
              <p className="text-xs text-[var(--color-text-muted)] font-body text-center max-w-sm">
                Running NeuralProt across all 375 model groups and computing
                frequency baseline. This may take a few minutes.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {status === 'done' && results && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              {groupEntries.length === 0 ? (
                <div className="glass-card rounded-2xl border border-[var(--color-border)] p-10 text-center">
                  <p className="text-[var(--color-text-muted)] font-body text-sm leading-relaxed">
                    No groups were evaluated. This usually means no protein IDs in the FASTA
                    matched the TSV. Check that both files use the same UniProt accession format.
                  </p>
                </div>
              ) : (
                <>
                  {/* Overall metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MetricCard
                      label="Overall Fmax"
                      value={results.overall_macro_fmax?.toFixed(4) ?? '—'}
                      sub="CAFA protein-centric"
                      color="text-teal"
                      icon={TrendingUp}
                    />
                    <MetricCard
                      label="Overall Smin"
                      value={results.overall_macro_smin?.toFixed(4) ?? '—'}
                      sub="lower is better"
                      color="text-amber-400"
                      icon={TrendingDown}
                    />
                    <MetricCard
                      label="Groups beating baseline"
                      value={`${results.n_groups_beating_baseline} / ${results.n_groups_evaluated}`}
                      sub="by Fmax score"
                      color="text-teal"
                      icon={BarChart3}
                    />
                    <MetricCard
                      label="Groups evaluated"
                      value={results.n_groups_evaluated}
                      sub="of 375 total"
                      icon={FlaskConical}
                    />
                  </div>

                  {/* Fmax chart */}
                  <div className="glass-card rounded-2xl border border-[var(--color-border)] p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-display font-bold text-base text-[var(--color-text)]">
                        Fmax — NeuralProt vs Frequency Baseline
                      </h3>
                      <span className="text-xs text-[var(--color-text-muted)] font-body">
                        Top 20 groups · higher is better
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-teal" />
                        <span className="text-xs font-body text-[var(--color-text-muted)]">NeuralProt</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[var(--color-border)]" />
                        <span className="text-xs font-body text-[var(--color-text-muted)]">Frequency Baseline</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={fmaxChartData} layout="vertical"
                        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                        <YAxis type="category" dataKey="name" width={180}
                          tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="NeuralProt" fill="#00C9A7" radius={[0, 3, 3, 0]} />
                        <Bar dataKey="Baseline"   fill="var(--color-border)" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Smin chart */}
                  <div className="glass-card rounded-2xl border border-[var(--color-border)] p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-display font-bold text-base text-[var(--color-text)]">
                        Smin — NeuralProt vs Frequency Baseline
                      </h3>
                      <span className="text-xs text-[var(--color-text-muted)] font-body">
                        Top 20 groups · lower is better
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-body mb-4">
                      Semantic distance from true annotations weighted by GO term information content
                    </p>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={sminChartData} layout="vertical"
                        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                        <YAxis type="category" dataKey="name" width={180}
                          tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="NeuralProt" fill="#00C9A7" radius={[0, 3, 3, 0]} />
                        <Bar dataKey="Baseline"   fill="var(--color-border)" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Per-group table */}
                  <div className="glass-card rounded-2xl border border-[var(--color-border)] p-5">
                    <h3 className="font-display font-bold text-base text-[var(--color-text)] mb-4">
                      Per-group results
                    </h3>
                    <div className="overflow-x-auto">
                      <GroupTable groups={results.group_results} />
                    </div>
                  </div>

                  {/* Export */}
                  <div className="flex justify-center">
                    <motion.button
                      onClick={downloadResults}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl
                        border border-teal/30 bg-teal/5 text-teal
                        font-display font-semibold text-sm
                        hover:bg-teal/10 transition-colors duration-200 cursor-pointer"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Download size={15} />
                      Download Results JSON
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}