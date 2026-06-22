import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Dna, Upload, AlertTriangle, CheckCircle, X, FlaskConical, Zap, Truck } from 'lucide-react'
import { EXAMPLE_SEQUENCES } from '../../utils/exampleSequences'

// ── Valid amino acid characters ───────────────────────────────
const VALID_AA = new Set('ACDEFGHIKLMNPQRSTVWY')

function validateSequence(seq) {
  const cleaned = seq.toUpperCase().replace(/\s/g, '')
  const invalid = []
  for (const char of cleaned) {
    if (!VALID_AA.has(char) && !invalid.includes(char)) {
      invalid.push(char)
    }
  }
  return { cleaned, invalid, length: cleaned.length }
}

// ── Tab button ────────────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-5 py-3 rounded-xl
        font-display font-medium text-sm transition-all duration-200 cursor-pointer
        ${active
          ? 'bg-teal/10 border border-teal/30 text-teal'
          : 'border border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'
        }`}
    >
      <Icon size={15} strokeWidth={2.2} />
      <span>{label}</span>
      <span className={`hidden sm:inline text-xs font-body
        ${active ? 'text-teal/60' : 'text-[var(--color-text-muted)]'}`}>
        → {sub}
      </span>
      {active && (
        <motion.div
          className="absolute bottom-0 left-4 right-4 h-px bg-teal rounded-full"
          layoutId="tab-indicator"
        />
      )}
    </button>
  )
}

// ── Example pill button ───────────────────────────────────────
function ExamplePill({ icon: Icon, label, color, onClick }) {
  const colorStyles = {
    red:   'border-rose-500/30 bg-rose-500/5 text-rose-400 hover:border-rose-500/60',
    green: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:border-emerald-500/60',
    blue:  'border-blue-500/30 bg-blue-500/5 text-blue-400 hover:border-blue-500/60',
  }
  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full
        border text-xs font-display font-medium
        transition-colors duration-200 cursor-pointer
        ${colorStyles[color]}`}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
    >
      <Icon size={12} />
      {label}
    </motion.button>
  )
}

// ── Single sequence tab ───────────────────────────────────────
function SingleSequenceTab({ onSubmit, demoSequence }) {
  const [value,   setValue]   = useState('')
  const [warning, setWarning] = useState(false)
  const [invalid, setInvalid] = useState([])
  const shouldReduce = useReducedMotion()
  const timeoutRef   = useRef(null)

  // Load demo sequence if triggered from hero
  useEffect(() => {
    if (demoSequence) setValue(demoSequence)
  }, [demoSequence])

  const handleChange = (e) => {
    const raw = e.target.value
    setValue(raw)
    const { invalid: inv } = validateSequence(raw)
    setInvalid(inv)

    if (inv.length > 0) {
      setWarning(true)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setWarning(false), 3000)
    } else {
      setWarning(false)
    }
  }

  const loadExample = (key) => {
    const seq = EXAMPLE_SEQUENCES[key].sequence
    setValue(seq)
    setInvalid([])
    setWarning(false)
  }

  const clear = () => { setValue(''); setInvalid([]); setWarning(false) }

  const { cleaned, length } = validateSequence(value)

  const handleSubmit = () => {
    if (!cleaned) return
    onSubmit({ type: 'single', sequence: cleaned })
  }

  const lengthColor =
    length === 0   ? 'text-[var(--color-text-muted)]' :
    length < 50    ? 'text-rose-400' :
    length < 5000  ? 'text-teal' :
                     'text-amber-400'

  return (
    <div className="space-y-4">
      {/* Textarea wrapper */}
      <div className="relative">
        <motion.div
          className={`relative rounded-xl border-2 transition-colors duration-300 overflow-hidden
            ${warning
              ? 'border-amber-400/60'
              : value && invalid.length === 0
                ? 'border-teal/40'
                : 'border-[var(--color-border)] focus-within:border-teal/50'
            }`}
          animate={warning && !shouldReduce
            ? { x: [0, -4, 4, -4, 4, 0] }
            : { x: 0 }
          }
          transition={{ duration: 0.35 }}
        >
          {/* Editor header bar */}
          <div className="flex items-center justify-between px-4 py-2
            border-b border-[var(--color-border)] bg-[var(--color-bg-muted)]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-2 text-xs font-mono text-[var(--color-text-muted)]">
                sequence.fasta
              </span>
            </div>

            {/* Live status */}
            <div className="flex items-center gap-3">
              {invalid.length > 0 && (
                <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  Non-standard: {invalid.join(', ')}
                </span>
              )}
              {value && invalid.length === 0 && length > 0 && (
                <span className="text-xs font-mono text-teal flex items-center gap-1">
                  <CheckCircle size={11} />
                  Valid
                </span>
              )}
              {value && (
                <button
                  onClick={clear}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                    transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={value}
            onChange={handleChange}
            placeholder={`Paste your amino acid sequence here...\n\nExample: MENFQKVEKIGEGTYGVVYK...`}
            className="w-full h-48 px-4 py-4 font-mono text-sm resize-none outline-none
              bg-[var(--color-card)] text-[var(--color-text)]
              placeholder:text-[var(--color-text-muted)]/50
              leading-relaxed tracking-wide"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />

          {/* Warning tooltip */}
          <AnimatePresence>
            {warning && (
              <motion.div
                className="absolute bottom-3 left-4 right-4 flex items-center gap-2
                  px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-400/30"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
              >
                <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
                <span className="text-xs font-body text-amber-300">
                  Non-standard character detected → will be cleaned before processing
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Character counter */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono ${lengthColor}`}>
              {length} amino acids
            </span>
            {length > 0 && length < 50 && (
              <span className="text-xs text-rose-400 font-body">
                Minimum 50 recommended
              </span>
            )}
          </div>
          <span className="text-xs text-[var(--color-text-muted)] font-mono">
            {length > 0 ? `${((length / 5000) * 100).toFixed(1)}% of max` : 'max 5000 aa'}
          </span>
        </div>
      </div>

      {/* Example pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)] font-body mr-1">
          Try an example:
        </span>
        <ExamplePill
          icon={FlaskConical}
          label="Human CDK2"
          color="red"
          onClick={() => loadExample('enzyme')}
        />
        <ExamplePill
          icon={Zap}
          label="Human KCNA1"
          color="green"
          onClick={() => loadExample('ionChannel')}
        />
        <ExamplePill
          icon={Truck}
          label="Human SLC2A1"
          color="blue"
          onClick={() => loadExample('transporter')}
        />
      </div>

      {/* Submit button */}
      <motion.button
        onClick={handleSubmit}
        disabled={!cleaned || length < 1}
        className={`w-full flex items-center justify-center gap-2.5
          py-3.5 rounded-xl font-display font-semibold text-sm
          transition-all duration-200 cursor-pointer
          ${cleaned && length > 0
            ? 'bg-teal text-[#0A0F1E] shadow-teal-glow hover:bg-teal-light'
            : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] cursor-not-allowed'
          }`}
        whileHover={cleaned ? { scale: 1.02 } : {}}
        whileTap={cleaned ? { scale: 0.98 } : {}}
      >
        <Dna size={16} />
        Predict Functions
      </motion.button>
    </div>
  )
}

// ── FASTA batch tab ───────────────────────────────────────────
function FastaBatchTab({ onSubmit }) {
  const [file,     setFile]     = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.name.endsWith('.fasta') || dropped.name.endsWith('.fa'))) {
      setFile(dropped)
    }
  }

  const handleFile = (e) => {
    const selected = e.target.files[0]
    if (selected) setFile(selected)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <motion.div
        className={`relative rounded-xl border-2 border-dashed
          transition-colors duration-200 cursor-pointer
          ${dragging
            ? 'border-teal bg-teal/5'
            : file
              ? 'border-teal/40 bg-teal/5'
              : 'border-[var(--color-border)] hover:border-teal/40'
          }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.005 }}
        animate={dragging ? { scale: 1.02 } : { scale: 1 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".fasta,.fa"
          className="hidden"
          onChange={handleFile}
        />

        <div className="flex flex-col items-center justify-center gap-3 py-16 px-8">
          <motion.div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center
              ${file ? 'bg-teal/15 border border-teal/30' : 'bg-[var(--color-bg-muted)] border border-[var(--color-border)]'}`}
            animate={dragging ? { scale: 1.15, rotate: 5 } : { scale: 1, rotate: 0 }}
          >
            {file
              ? <CheckCircle size={24} className="text-teal" />
              : <Upload size={24} className="text-[var(--color-text-muted)]" />
            }
          </motion.div>

          {file ? (
            <>
              <p className="font-display font-semibold text-teal text-sm">
                {file.name}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] font-body">
                {(file.size / 1024).toFixed(1)} KB → Click to change file
              </p>
            </>
          ) : (
            <>
              <p className="font-display font-semibold text-[var(--color-text)] text-sm">
                Drop your FASTA file here
              </p>
              <p className="text-xs text-[var(--color-text-muted)] font-body text-center">
                Accepts <span className="font-mono text-teal">.fasta</span> and{' '}
                <span className="font-mono text-teal">.fa</span> files · Click to browse
              </p>
            </>
          )}
        </div>

        {/* Animated dashed border shimmer */}
        {dragging && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,201,167,0.1), transparent)',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.div>

      {/* Submit */}
      <motion.button
        onClick={() => file && onSubmit({ type: 'batch', file })}
        disabled={!file}
        className={`w-full flex items-center justify-center gap-2.5
          py-3.5 rounded-xl font-display font-semibold text-sm
          transition-all duration-200
          ${file
            ? 'bg-teal text-[#0A0F1E] shadow-teal-glow hover:bg-teal-light cursor-pointer'
            : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] cursor-not-allowed'
          }`}
        whileHover={file ? { scale: 1.02 } : {}}
        whileTap={file ? { scale: 0.98 } : {}}
      >
        <Upload size={16} />
        Upload &amp; Process Batch
      </motion.button>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
export default function SequenceInput({ onSubmit, demoSequence }) {
  const [activeTab, setActiveTab] = useState('single')

  return (
    <div className="glass-card rounded-2xl border border-[var(--color-border)] overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)]">
        <h2 className="font-display font-bold text-lg text-[var(--color-text)] mb-1">
          Prediction Suite
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] font-body">
          Paste a single sequence or upload a FASTA batch file
        </p>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-4">
          <TabButton
            active={activeTab === 'single'}
            onClick={() => setActiveTab('single')}
            icon={Dna}
            label="Single Sequence"
            sub="paste amino acids"
          />
          <TabButton
            active={activeTab === 'batch'}
            onClick={() => setActiveTab('batch')}
            icon={Upload}
            label="FASTA Batch"
            sub="upload file"
          />
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'single' ? (
            <motion.div
              key="single"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <SingleSequenceTab
                onSubmit={onSubmit}
                demoSequence={demoSequence}
              />
            </motion.div>
          ) : (
            <motion.div
              key="batch"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <FastaBatchTab onSubmit={onSubmit} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}