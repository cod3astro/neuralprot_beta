import { motion, useReducedMotion } from 'motion/react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Dna, BookOpen, ChevronRight, BarChart3, GitBranch, Layers, Sparkles,
  Network, Award, FileText, Cpu, TrendingUp, Shield, Zap, FlaskConical
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Animated background orbs (unchanged, fine on mobile)
// ─────────────────────────────────────────────────────────────
function BackgroundOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute rounded-full opacity-[0.12] dark:opacity-[0.15] blur-3xl"
        style={{ width: '600px', height: '600px', top: '-200px', left: '-100px',
          background: 'radial-gradient(circle, #00C9A7, transparent 70%)',
          animation: 'orbDrift 14s ease-in-out infinite alternate' }} />
      <div className="absolute rounded-full opacity-[0.08] dark:opacity-[0.12] blur-3xl"
        style={{ width: '500px', height: '500px', top: '100px', right: '-150px',
          background: 'radial-gradient(circle, #00E5FF, transparent 70%)',
          animation: 'orbDrift 18s ease-in-out infinite alternate-reverse' }} />
      <div className="absolute rounded-full opacity-[0.07] dark:opacity-[0.10] blur-3xl"
        style={{ width: '400px', height: '400px', bottom: '-100px', left: '30%',
          background: 'radial-gradient(circle, #7C5CFC, transparent 70%)',
          animation: 'orbDrift 22s ease-in-out infinite alternate' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// StatPill (unchanged)
// ─────────────────────────────────────────────────────────────
function StatPill({ value, label, delay }) {
  const shouldReduce = useReducedMotion()
  return (
    <motion.div
      className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full
        border border-[var(--color-border)] bg-[var(--color-card)]
        shadow-card-dark dark:shadow-card-dark shadow-card-light"
      initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <span className="font-mono font-semibold text-teal text-xs sm:text-sm">{value}</span>
      <span className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-body">{label}</span>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// AnimatedHeadline (unchanged)
// ─────────────────────────────────────────────────────────────
function AnimatedHeadline() {
  const shouldReduce = useReducedMotion()
  const words = ['Decode', 'What', 'a', 'Protein', 'Does']
  return (
    <h1 className="font-display font-bold tracking-tight text-center
      text-3xl sm:text-5xl md:text-6xl lg:text-7xl
      text-[var(--color-text)] leading-[1.1]">
      {words.map((word, i) => (
        <motion.span
          key={i}
          className={`inline-block mr-[0.25em] ${word === 'Protein' ? 'text-teal' : ''} ${word === 'Decode' ? 'dark:text-cyan text-deepteal' : ''}`}
          initial={shouldReduce ? {} : { opacity: 0, y: 40, rotateX: -20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.1 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  )
}

// ─────────────────────────────────────────────────────────────
// How It Works steps (unchanged)
// ─────────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { number: '01', title: 'Paste or Upload', desc: 'Drop in a single amino acid sequence or a full FASTA batch file.', color: 'teal' },
  { number: '02', title: '498 Features Extracted', desc: 'The engine reads amino acid ratios, dipeptide shapes, and biophysical properties.', color: 'cyan' },
  { number: '03', title: '375 Models Run', desc: 'Each neural network in the ensemble votes on the protein\'s probable functions.', color: 'violet' },
  { number: '04', title: 'GO Terms Revealed', desc: 'Specific functions and confirmed biological laws are returned, ranked by confidence.', color: 'teal' },
]
const colorMap = {
  teal: { border: 'border-teal/30', bg: 'bg-teal/10', text: 'text-teal', dot: 'bg-teal' },
  cyan: { border: 'border-cyan/30', bg: 'bg-cyan/10', text: 'text-cyan', dot: 'bg-cyan' },
  violet: { border: 'border-violet/30', bg: 'bg-violet/10', text: 'text-violet', dot: 'bg-violet' },
}

function HowItWorksSection() {
  const shouldReduce = useReducedMotion()
  return (
    <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <motion.div className="flex items-center justify-center gap-3 mb-4"
        initial={shouldReduce ? {} : { opacity: 0 }}
        whileInView={{ opacity: 1 }} viewport={{ once: true }}
        transition={{ duration: 0.4 }}>
        <div className="h-px w-12 bg-teal/40" />
        <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">How It Works</span>
        <div className="h-px w-12 bg-teal/40" />
      </motion.div>
      <motion.h2 className="font-display font-bold text-center text-2xl sm:text-3xl text-[var(--color-text)] mb-10 md:mb-16"
        initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}>
        From sequence to function in four steps
      </motion.h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {HOW_IT_WORKS.map((step, i) => {
          const c = colorMap[step.color]
          return (
            <motion.div key={step.number}
              className={`relative glass-card rounded-2xl p-5 md:p-6 border ${c.border} overflow-hidden group hover:shadow-teal-glow transition-shadow duration-300`}
              initial={shouldReduce ? {} : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              whileHover={{ y: -4 }}>
              <span className={`absolute -top-3 -right-1 font-display font-bold text-7xl ${c.text} opacity-[0.07] select-none pointer-events-none`}>
                {step.number}
              </span>
              <div className={`w-2 h-2 rounded-full ${c.dot} mb-4`} />
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${c.bg} border ${c.border} mb-4`}>
                <span className={`font-mono text-xs font-semibold ${c.text}`}>{step.number}</span>
              </div>
              <h3 className="font-display font-semibold text-base text-[var(--color-text)] mb-2">{step.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed font-body">{step.desc}</p>
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight size={16} className="text-[var(--color-border)]" />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// 498 Features Explained (mobile responsive)
// ─────────────────────────────────────────────────────────────
const FEATURE_CATEGORIES = [
  { icon: Layers, title: "Amino Acid Composition", desc: "20 features; fraction of each of the 20 standard amino acids. Reveals overall chemical bias.", color: "teal" },
  { icon: GitBranch, title: "Dipeptide Composition", desc: "400 features; frequency of every adjacent pair. Captures local sequence motifs and nearest‑neighbour effects.", color: "cyan" },
  { icon: BarChart3, title: "Physicochemical Profile", desc: "8 features; molecular weight, hydrophobicity (GRAVY), charge, isoelectric point, instability index, aliphatic index.", color: "violet" },
  { icon: Sparkles, title: "Local & Structural", desc: "4+3+1 features; hydrophobic peaks, charge density, disorder (TOP‑IDP), repetitive entropy, secondary structure propensities (helix/sheet/coil), and sequence complexity.", color: "teal" },
  { icon: GitBranch, title: "CTD Descriptors", desc: "56 features; how 7 physicochemical properties transition and distribute along the chain.", color: "cyan" },
  { icon: Layers, title: "Quasi‑Sequence Order", desc: "6 features; long‑range coupling via Schneider‑Wrede distances. Captures non‑local interactions.", color: "violet" },
]

function FeaturesExplained() {
  const shouldReduce = useReducedMotion()
  return (
    <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <motion.div className="flex items-center justify-center gap-3 mb-4"
        initial={shouldReduce ? {} : { opacity: 0 }}
        whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <div className="h-px w-12 bg-teal/40" />
        <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">498‑Dimensional Insight</span>
        <div className="h-px w-12 bg-teal/40" />
      </motion.div>
      <motion.h2 className="font-display font-bold text-center text-2xl sm:text-3xl text-[var(--color-text)] mb-6"
        initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        How the models sees your protein
      </motion.h2>
      <motion.p className="text-center text-[var(--color-text-muted)] max-w-2xl mx-auto mb-10 md:mb-12 px-2 text-sm md:text-base"
        initial={shouldReduce ? {} : { opacity: 0 }}
        whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        Instead of raw sequence letters, our models read a rich vector of biophysical properties from basic composition to long‑range couplings.
      </motion.p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {FEATURE_CATEGORIES.map((cat, i) => {
          const Icon = cat.icon
          return (
            <motion.div key={cat.title}
              className="glass-card rounded-xl border border-[var(--color-border)] p-5 md:p-6 hover:border-teal/40 transition-all duration-300"
              initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              whileHover={{ y: -4 }}>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-teal/10 flex items-center justify-center mb-3 md:mb-4">
                <Icon size={18} className="text-teal" />
              </div>
              <h3 className="font-display font-semibold text-base md:text-lg text-[var(--color-text)] mb-2">{cat.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed font-body">{cat.desc}</p>
            </motion.div>
          )
        })}
      </div>
      <motion.div className="mt-10 text-center text-xs text-[var(--color-text-muted)] font-mono"
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <span className="bg-teal/10 px-3 py-1 rounded-full inline-block">Total: 498 features → 375 model ensemble → GO term predictions</span>
      </motion.div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// GO Tree Visual with horizontal scroll on mobile
// ─────────────────────────────────────────────────────────────
function GOTreeVisual() {
  const shouldReduce = useReducedMotion()
  return (
    <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-[var(--color-border)]">
      <motion.div className="flex items-center justify-center gap-3 mb-4"
        initial={shouldReduce ? {} : { opacity: 0 }}
        whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <div className="h-px w-12 bg-teal/40" />
        <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Gene Ontology Explained</span>
        <div className="h-px w-12 bg-teal/40" />
      </motion.div>
      <motion.h2 className="font-display font-bold text-center text-2xl sm:text-3xl text-[var(--color-text)] mb-6"
        initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        Why overlapping predictions are a feature, not a bug
      </motion.h2>
      
      <div className="max-w-5xl mx-auto">
        {/* Scrollable tree container */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="min-w-[580px] md:min-w-0">
            <div className="glass-card rounded-xl border border-[var(--color-border)] p-4 md:p-8 mb-8">
              <div className="text-center mb-4 md:mb-6">
                <span className="text-xs font-mono bg-teal/10 px-2 md:px-3 py-1 rounded-full">Directed Acyclic Graph (DAG) – Simplified</span>
              </div>
              {/* Visual tree */}
              <div className="relative flex justify-center">
                <div className="w-full max-w-2xl">
                  <div className="text-center mb-4">
                    <div className="inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-lg bg-teal/10 border border-teal/30 text-teal font-mono text-xs md:text-sm">GO:0003674 (molecular_function)</div>
                  </div>
                  <div className="relative flex justify-center gap-8 md:gap-16 mb-2">
                    <div className="w-20 md:w-32 h-6 md:h-8 border-l-2 border-t-2 border-teal/30 rounded-tl-lg"></div>
                    <div className="w-20 md:w-32 h-6 md:h-8 border-r-2 border-t-2 border-teal/30 rounded-tr-lg"></div>
                  </div>
                  <div className="flex justify-center gap-6 md:gap-12 mb-4 md:mb-6">
                    <div className="text-center"><div className="px-2 md:px-3 py-1 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan text-[10px] md:text-xs font-mono">GO:0003824<br/>catalytic activity</div></div>
                    <div className="text-center"><div className="px-2 md:px-3 py-1 rounded-lg bg-violet/10 border border-violet/30 text-violet text-[10px] md:text-xs font-mono">GO:0005215<br/>transporter activity</div></div>
                    <div className="text-center"><div className="px-2 md:px-3 py-1 rounded-lg bg-teal/10 border border-teal/30 text-teal text-[10px] md:text-xs font-mono">GO:0005488<br/>binding</div></div>
                  </div>
                  <div className="relative flex justify-center gap-4 md:gap-8 mb-2">
                    <div className="w-16 md:w-24 h-4 md:h-6 border-l-2 border-b-2 border-cyan/30 rounded-bl-lg"></div>
                    <div className="w-4 md:w-8"></div>
                    <div className="w-16 md:w-24 h-4 md:h-6 border-r-2 border-b-2 border-violet/30 rounded-br-lg"></div>
                  </div>
                  <div className="flex justify-center gap-6 md:gap-12">
                    <div className="text-center"><div className="px-1.5 md:px-2 py-0.5 md:py-1 rounded-md bg-cyan/20 border border-cyan/40 text-cyan text-[9px] md:text-[11px] font-mono">GO:0016740<br/>transferase activity</div></div>
                    <div className="text-center"><div className="px-1.5 md:px-2 py-0.5 md:py-1 rounded-md bg-violet/20 border border-violet/40 text-violet text-[9px] md:text-[11px] font-mono">GO:0022857<br/>transmembrane transporter</div></div>
                  </div>
                  <div className="relative flex justify-center gap-6 md:gap-12 mt-2 md:mt-3">
                    <div className="w-16 md:w-24 h-4 md:h-6 border-l-2 border-b-2 border-cyan/30 rounded-bl-lg"></div>
                    <div className="w-4 md:w-8"></div>
                  </div>
                  <div className="flex justify-center gap-6 md:gap-12">
                    <div className="text-center"><div className="px-1.5 md:px-2 py-0.5 md:py-1 rounded-md bg-teal/20 border border-teal/40 text-teal text-[9px] md:text-[11px] font-mono font-semibold">GO:0004672<br/>protein kinase activity</div></div>
                  </div>
                </div>
              </div>
              <div className="mt-6 md:mt-8 text-center text-xs text-[var(--color-text-muted)]">
                <p className="flex items-center justify-center gap-1.5">
  <Sparkles size={13} className="text-teal flex-shrink-0" />
  <span><strong>True Path Rule:</strong> GO:0004672 (kinase) implies GO:0016740 (transferase) and GO:0003824 (catalytic).</span>
</p>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="glass-card rounded-xl border border-[var(--color-border)] p-4 md:p-5">
            <h3 className="font-display font-semibold text-sm md:text-base text-teal mb-2 flex items-center gap-2"><Award size={16} /> Hierarchical Consistency</h3>
            <p className="text-xs md:text-sm text-[var(--color-text-muted)] leading-relaxed">Our ensemble often predicts both a child term and its parent. This is <strong>biologically correct,</strong>  the model expresses confidence across levels. You'll see this reflected in the Hierarchy panel.</p>
          </div>
          <div className="glass-card rounded-xl border border-[var(--color-border)] p-4 md:p-5">
            <h3 className="font-display font-semibold text-sm md:text-base text-cyan mb-2 flex items-center gap-2"><Network size={16} /> Multi‑function Proteins</h3>
            <p className="text-xs md:text-sm text-[var(--color-text-muted)] leading-relaxed">Many proteins have multiple roles (e.g., kinase and scaffold). The top 5 ‑ 10 GO terms represent the most confident functional assignments, which may belong to different branches of the DAG.</p>
          </div>
          <div className="glass-card rounded-xl border border-[var(--color-border)] p-4 md:p-5">
            <h3 className="font-display font-semibold text-sm md:text-base text-violet mb-2 flex items-center gap-2"><Shield size={16} /> Confidence Thresholds</h3>
            <p className="text-xs md:text-sm text-[var(--color-text-muted)] leading-relaxed">Each prediction includes a confidence score (0 ‑ 1). Use the slider to filter low‑confidence terms. The hierarchy view shows how child terms support parent nodes via the True Path Rule.</p>
          </div>
          <div className="glass-card rounded-xl border border-[var(--color-border)] p-4 md:p-5">
            <h3 className="font-display font-semibold text-sm md:text-base text-teal mb-2 flex items-center gap-2"><FileText size={16} /> CAFA Standard Output</h3>
            <p className="text-xs md:text-sm text-[var(--color-text-muted)] leading-relaxed">Results follow the Critical Assessment of Functional Annotation (CAFA) format, easy to export and compare with other tools.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Ensemble Explanation (mobile responsive)
// ─────────────────────────────────────────────────────────────
function EnsembleExplanation() {
  const shouldReduce = useReducedMotion()
  return (
    <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-[var(--color-border)]">
      <motion.div className="flex items-center justify-center gap-3 mb-4"
        initial={shouldReduce ? {} : { opacity: 0 }}
        whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <div className="h-px w-12 bg-teal/40" />
        <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Deep Ensemble</span>
        <div className="h-px w-12 bg-teal/40" />
      </motion.div>
      <motion.h2 className="font-display font-bold text-center text-2xl sm:text-3xl text-[var(--color-text)] mb-6"
        initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        Why 375 neural networks?
      </motion.h2>
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-xl border border-[var(--color-border)] p-5 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
            <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-teal/20 to-cyan/20 flex items-center justify-center border border-teal/30">
              <span className="text-3xl md:text-4xl font-mono font-bold text-teal">375</span>
            </div>
            <div className="flex-1 space-y-2 md:space-y-3">
              <p className="text-sm md:text-base text-[var(--color-text)] leading-relaxed">A single neural network can be overconfident or biased. We train <strong>375 diverse architectures</strong> (different layers, dropout rates, activation functions, and weight initializations) to create a <strong>robust ensemble</strong>.</p>
              <ul className="list-disc list-inside text-xs md:text-sm text-[var(--color-text-muted)] space-y-1">
                <li>Each model votes on GO terms independently.</li>
                <li>The final confidence score is the <strong>average vote across all models</strong>.</li>
                <li>High agreement = high confidence. Disagreement = ambiguity (reflected in lower scores).</li>
                <li>This ensemble method reduces variance and improves generalization on unseen proteins.</li>
              </ul>
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-[10px] md:text-xs bg-teal/10 px-2 py-1 rounded-full text-teal">
  <Zap size={10} /> Robust to overfitting
</span>
<span className="flex items-center gap-1.5 text-[10px] md:text-xs bg-cyan/10 px-2 py-1 rounded-full text-cyan">
  <TrendingUp size={10} /> Calibrated confidence
</span>
<span className="flex items-center gap-1.5 text-[10px] md:text-xs bg-violet/10 px-2 py-1 rounded-full text-violet">
  <Dna size={10} /> Works across diverse families
</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Cite Section (mobile responsive)
// ─────────────────────────────────────────────────────────────
function CiteSection() {
  const shouldReduce = useReducedMotion()
  return (
    <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-[var(--color-border)]">
      <motion.div className="flex items-center justify-center gap-3 mb-4"
        initial={shouldReduce ? {} : { opacity: 0 }}
        whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <div className="h-px w-12 bg-teal/40" />
        <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Open Research</span>
        <div className="h-px w-12 bg-teal/40" />
      </motion.div>
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2 className="font-display font-bold text-2xl sm:text-3xl text-[var(--color-text)] mb-6"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          Trusted by computational biologists
        </motion.h2>
        <motion.div className="glass-card rounded-xl border border-[var(--color-border)] p-5 md:p-6"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-[var(--color-text-muted)] text-xs md:text-sm mb-4">NeuralProt is built on publicly available data and open‑source principles. If you use it in your research, please cite:</p>
          <div className="bg-[var(--color-bg-muted)] p-3 md:p-4 rounded-lg font-mono text-xs text-left border border-[var(--color-border)]">
            <p>NeuralProt: A 375‑model ensemble for protein function prediction from sequence.<br/>
            (preprint coming soon, contact for early citation)</p>
          </div>
          <div className="mt-6 flex justify-center gap-4">
  <Link to="/docs"
    className="flex items-center gap-1.5 text-teal text-xs md:text-sm hover:underline">
    <BookOpen size={13} /> Documentation
  </Link>
  <Link to="/about"
    className="flex items-center gap-1.5 text-teal text-xs md:text-sm hover:underline">
    <FlaskConical size={13} /> Methods
  </Link>
  <Link to="/evaluate"
    className="flex items-center gap-1.5 text-teal text-xs md:text-sm hover:underline">
    <BarChart3 size={13} /> Benchmark
  </Link>
</div>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Home component
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const shouldReduce = useReducedMotion()

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 pt-20 md:pt-24 pb-12 md:pb-16 overflow-hidden">
        <BackgroundOrbs />
        <div className="dark:hidden pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(0,122,99,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,122,99,0.06) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }} />
        
        <motion.div className="relative mb-6 md:mb-8 inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-teal/30 bg-teal/5"
          initial={shouldReduce ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <motion.span className="w-1.5 h-1.5 rounded-full bg-teal"
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
          <span className="text-[10px] md:text-xs font-mono text-teal tracking-widest uppercase">Beta — Open for Research</span>
        </motion.div>

        <div className="relative mb-5 md:mb-6 perspective-[800px]">
          <AnimatedHeadline />
        </div>

        <motion.p className="relative max-w-xl mx-auto text-sm sm:text-lg text-[var(--color-text-muted)] font-body leading-relaxed mb-8 md:mb-10 px-2"
          initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.5 }}>
          <span className="font-mono text-teal font-semibold">375</span> neural architectures.{' '}
          <span className="font-mono text-cyan font-semibold">498</span> biophysical dimensions.{' '}
          One prediction engine.
        </motion.p>

        <motion.div className="relative flex flex-col sm:flex-row items-center gap-3 mb-12 md:mb-16"
          initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }}>
          <motion.button
            onClick={() => navigate('/predict')}
            className="group flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-full bg-teal text-[#0A0F1E] font-display font-semibold text-sm hover:bg-teal-light transition-colors duration-200 shadow-teal-glow cursor-pointer"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Dna size={16} />
            Launch Predictor
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
          </motion.button>
          <motion.button
            onClick={() => navigate('/docs')}
            className="flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] font-display font-semibold text-sm hover:border-teal hover:text-teal transition-colors duration-200 cursor-pointer"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <BookOpen size={16} />
            Read the Docs
          </motion.button>
        </motion.div>

        <motion.div className="relative flex flex-wrap items-center justify-center gap-2 sm:gap-3"
          initial={shouldReduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.5 }}>
          <StatPill value="375" label="Neural Models" delay={1.1} />
          <StatPill value="498D" label="Feature Vector" delay={1.2} />
          <StatPill value="75%" label="Hierarchy Threshold" delay={1.3} />
          <StatPill value="CAFA" label="Standard Output" delay={1.4} />
        </motion.div>
      </section>

      <HowItWorksSection />
      <FeaturesExplained />
      <GOTreeVisual />
      <EnsembleExplanation />
      <CiteSection />
      <div className="h-12 md:h-16" />
    </div>
  )
}