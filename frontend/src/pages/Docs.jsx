import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Code, Database, Cpu, GitBranch, Layers, Shield } from 'lucide-react'

// ── Feature vector reference ──────────────────────────────────
const FEATURE_ROWS = [
  { range: '[0 : 20]',    type: 'Amino acid composition',       dims: '20',  color: 'teal',   desc: 'Fraction of each of the 20 standard amino acids in the sequence.' },
  { range: '[20 : 420]',  type: 'Dipeptide composition',        dims: '400', color: 'teal',   desc: 'Fraction of each possible adjacent amino acid pair (20×20 = 400 combinations).' },
  { range: '[420 : 428]', type: 'Core physicochemical',         dims: '8',   color: 'cyan',   desc: 'Normalised length, molecular weight, GRAVY score, aromaticity, instability index, isoelectric point, charge at pH 7, aliphatic index.' },
  { range: '[428 : 432]', type: 'Local spot features',          dims: '4',   color: 'cyan',   desc: 'Max local hydropathy (9-aa window), max local charge density (7-aa window), disorder fraction (TOP-IDP), RLE entropy.' },
  { range: '[432 : 435]', type: 'Secondary structure',          dims: '3',   color: 'violet', desc: 'Chou-Fasman helix, sheet, and coil propensity scores averaged over the full sequence.' },
  { range: '[435 : 436]', type: 'Shannon complexity',           dims: '1',   color: 'violet', desc: 'Sequence information entropy normalised by log₂(20), the theoretical maximum.' },
  { range: '[436 : 457]', type: 'CTD Transition descriptors',   dims: '21',  color: 'gold',   desc: 'Transition frequencies between physicochemical property classes along the chain (7 properties × 3 transition pairs).' },
  { range: '[457 : 492]', type: 'CTD Distribution descriptors', dims: '35',  color: 'gold',   desc: 'Percentile positions (0%, 25%, 50%, 75%, 100%) of group-1 residues for 7 physicochemical properties.' },
  { range: '[492 : 498]', type: 'QSO lag distances',            dims: '6',   color: 'violet', desc: 'Quasi-sequence order, Schneider-Wrede distance coupling between residues at lags 1 – 6.' },
]

const COLOR_MAP = {
  teal:   { dot: 'bg-teal',   text: 'text-teal',   badge: 'bg-teal/10 text-teal border-teal/30'     },
  cyan:   { dot: 'bg-cyan',   text: 'text-cyan',   badge: 'bg-cyan/10 text-cyan border-cyan/30'     },
  violet: { dot: 'bg-violet', text: 'text-violet', badge: 'bg-violet/10 text-violet border-violet/30' },
  gold:   { dot: 'bg-gold',   text: 'text-gold',   badge: 'bg-gold/10 text-gold border-gold/30'     },
}

// ── Pipeline sections ─────────────────────────────────────────
const SECTIONS = [
  {
    number: '01',
    title: 'Download the data',
    icon: Database,
    steps: [
      {
        label: 'UniProtKB Swiss-Prot TSV',
        body: 'Go to UniProtKB and search "Reviewed:true, Group:Gene Ontology, Proteins With:Function, Protein Existence:Protein Level". Click Download, select TSV format. Include columns: Entry, Sequence, Gene Ontology IDs, Protein names, Organism.',
        link: { href: 'https://www.uniprot.org/uniprotkb?query=reviewed:true', label: 'Open UniProtKB' },
      },
      {
        label: 'Swiss-Prot FASTA file',
        body: 'From the same search results page, download again in FASTA format. This gives you the amino acid sequences matched to the accessions in the TSV.',
      },
      {
        label: 'Gene Ontology OBO file',
        body: 'Download go-basic.obo from the Gene Ontology Consortium. Use go-basic specifically, not the full go.obo to keep hierarchy relationships unambiguous.',
        link: { href: 'https://geneontology.org/docs/download-ontology/', label: 'Download go-basic.obo' },
      },
    ],
  },
  {
    number: '02',
    title: 'Environment setup',
    icon: Code,
    steps: [
      {
        label: 'Python dependencies',
        code: 'pip install torch numpy scikit-learn fastapi uvicorn',
        body: 'No GPU required. All training and inference runs on standard CPU hardware. Training 375 models takes approximately 8 – 12 hours on a modern CPU.',
      },
      {
        label: 'Frontend dependencies',
        code: 'cd frontend && npm install',
        body: 'Requires Node.js 18+. The frontend runs on React + Vite + Tailwind CSS.',
      },
    ],
  },
  {
    number: '03',
    title: 'Training pipeline',
    icon: Cpu,
    steps: [
      {
        label: 'Step 1: Parse the GO hierarchy',
        code: 'python go_parser.py',
        body: 'Reads go-basic.obo and produces go_dict.json with all active GO terms, their namespaces, parent links, alternate IDs, and pre-computed ancestor sets for the True Path Rule.',
      },
      {
        label: 'Step 2: Assign GO terms to model groups',
        code: 'python go_group_assigner.py',
        body: 'Uses a bottom-up tree splitting strategy. Starts from the deepest, most specific leaf terms and groups them into training boxes of 15 – 100 terms. Leftover terms are clustered by biological cousins into fallback groups. Produces go_group_assignment_v3.json with 375 groups.',
      },
      {
        label: 'Step 3: Prepare training data',
        code: 'python data_pipeline.py',
        body: 'Applies annotation propagation (True Path Rule), builds binary label matrices, and computes pos_weight tensors for class imbalance correction. Saves labels.npz, pos_weights.npy, terms.json, and accessions.json per group.',
      },
      {
        label: 'Step 4: Extract 498 features',
        code: 'python feature_extractor.py',
        body: 'Computes the 498-dimensional biophysical feature vector for each protein sequence. Saves features.npy per protein. All features are normalised to approximately 0 – 1 range.',
      },
      {
        label: 'Step 5: Train all 375 models',
        code: 'train_model.ipynb',
        body: 'Trains one MLP per group with BCEWithLogitsLoss + pos_weight for class imbalance, Adam optimiser, and ReduceLROnPlateau scheduler. Uses an 80/10/10 train/val/test split. Saves {group}_best.pt after every validation improvement. Checkpoints allow safe interruption and resumption.',
      },
      {
        label: 'Step 6: Tune prediction thresholds',
        code: 'threshold_tuning.ipynb',
        body: 'Sweeps 100 threshold values per group on the validation set and selects the threshold with the highest macro F1. Saves optimal thresholds to models/threshold_results.json. Average gain: +0.11 F1 per group.',
      },
    ],
  },
  {
    number: '04',
    title: 'Running inference',
    icon: GitBranch,
    steps: [
      {
        label: 'Single sequence prediction',
        code: 'POST /predict/sequence',
        body: 'Extracts 498-dimensional features and runs all 375 group models. Returns GO terms predicted above each group\'s tuned threshold, sorted by confidence. Results are split into Neural Network AI predictions and Hierarchy Tree Rule confirmations.',
      },
      {
        label: 'FASTA batch prediction',
        code: 'POST /predict/fasta',
        body: 'Accepts a .fasta or .fa file containing multiple sequences. Processes each sequence independently and returns results keyed by protein ID.',
      },
      {
        label: 'CAFA evaluation',
        code: 'POST /fmax',
        body: 'Computes protein-centric Fmax and Smin following the CAFA standard, sweeping all thresholds. Runs a frequency baseline on identical data for comparison. Outputs per-group fmax and smin scores.',
      },
    ],
  },
  {
    number: '05',
    title: 'Starting the web app',
    icon: Layers,
    steps: [
      {
        label: 'Start the FastAPI backend',
        code: 'uvicorn neuralprot_backend:app --host 127.0.0.1 --port 8000 --reload',
        body: 'The backend loads all 375 models at startup. This takes about 30 – 60 seconds. Subsequent predictions are fast since all models stay in memory.',
      },
      {
        label: 'Start the frontend',
        code: 'cd frontend && npm run dev',
        body: 'Runs the React dev server at http://localhost:5173. Set VITE_API_URL=http://localhost:8000 in a .env file to connect to the backend.',
      },
      {
        label: 'Production build',
        code: 'cd frontend && npm run build',
        body: 'Outputs a static build to frontend/dist/ that can be served by any static file host.',
      },
    ],
  },
]

// ── Collapsible section ───────────────────────────────────────
function DocSection({ section, index }) {
  const [open, setOpen] = useState(index === 0)
  const shouldReduce = useReducedMotion()
  const Icon = section.icon

  return (
    <motion.div
      className="glass-card rounded-2xl border border-[var(--color-border)] overflow-hidden"
      initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-6 py-5
          hover:bg-[var(--color-bg-muted)] transition-colors duration-150 cursor-pointer text-left"
      >
        <span className="font-mono text-xs font-bold text-teal bg-teal/10
          border border-teal/30 px-2 py-1 rounded-lg flex-shrink-0">
          {section.number}
        </span>
        <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-muted)] border border-[var(--color-border)]
          flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-[var(--color-text-muted)]" />
        </div>
        <h2 className="font-display font-bold text-base text-[var(--color-text)] flex-1">
          {section.title}
        </h2>
        {open
          ? <ChevronUp size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
          : <ChevronDown size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
        }
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-[var(--color-border)] space-y-6 pt-5">
              {section.steps.map((step, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-2 h-2 rounded-full bg-teal flex-shrink-0 mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-[var(--color-text)] mb-2">
                      {step.label}
                    </p>
                    {step.code && (
                      <div className="bg-[var(--color-bg-muted)] border border-[var(--color-border)]
                        rounded-xl px-4 py-3 mb-3 overflow-x-auto">
                        <code className="font-mono text-xs font-semibold text-teal whitespace-pre">
                          {step.code}
                        </code>
                      </div>
                    )}
                    <p className="text-sm font-body text-[var(--color-text-muted)] leading-relaxed">
                      {step.body}
                    </p>
                    {step.link && (
                      <a
                        href={step.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs font-display
                          font-semibold text-teal hover:text-cyan transition-colors duration-150"
                      >
                        {step.link.label} <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Docs page ────────────────────────────────────────────
export default function Docs() {
  const shouldReduce = useReducedMotion()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header */}
        <motion.div
          className="text-center py-4"
          initial={shouldReduce ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
            border border-teal/30 bg-teal/5 mb-4">
            <BookOpen size={12} className="text-teal" />
            <span className="text-[10px] font-mono text-teal tracking-widest uppercase">
              Documentation
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[var(--color-text)] mb-3">
            How NeuralProt Works
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm font-body max-w-xl mx-auto leading-relaxed">
            Everything needed to reproduce the dataset, retrain the models,
            and extend NeuralProt to new GO term groups.
          </p>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-6 gap-px bg-[var(--color-border)]
            border border-[var(--color-border)] rounded-2xl overflow-hidden"
          initial={shouldReduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {[
            { label: 'Total proteins', value: '~105,000' },
            { label: 'Training Proteins',  value: '~84,000'   },
            { label: 'GO terms covered',  value: '12,000+'   },
            { label: 'Models trained',    value: '375'       },
            { label: 'Feature dims',      value: '498'       },
            { label: 'Hardware',          value: 'CPU only'  },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[var(--color-card)] px-4 py-4 text-center">
              <p className="font-mono font-bold text-lg text-teal mb-1">{value}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] font-body">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Pipeline sections */}
        {SECTIONS.map((section, i) => (
          <DocSection key={section.number} section={section} index={i} />
        ))}

        {/* Feature vector reference */}
        <motion.div
          className="glass-card rounded-2xl border border-[var(--color-border)] overflow-hidden"
          initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-4 px-6 py-5 border-b border-[var(--color-border)]">
            <span className="font-mono text-xs font-bold text-teal bg-teal/10
              border border-teal/30 px-2 py-1 rounded-lg flex-shrink-0">
              06
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-muted)] border border-[var(--color-border)]
              flex items-center justify-center flex-shrink-0">
              <Shield size={15} className="text-[var(--color-text-muted)]" />
            </div>
            <h2 className="font-display font-bold text-base text-[var(--color-text)]">
              498-Dimensional Feature Vector Reference
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {/* Total summary pills */}
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { label: '20 AAC', color: 'teal' },
                { label: '400 DPC', color: 'teal' },
                { label: '8 Physicochemical', color: 'cyan' },
                { label: '8 Local + SS + Entropy', color: 'cyan' },
                { label: '56 CTD', color: 'gold' },
                { label: '6 QSO', color: 'violet' },
              ].map(({ label, color }) => {
                const c = COLOR_MAP[color]
                return (
                  <span key={label} className={`inline-flex items-center px-2.5 py-1
                    rounded-full text-[10px] font-mono font-bold border ${c.badge}`}>
                    {label}
                  </span>
                )
              })}
            </div>

            {/* Feature rows — hidden on tiny screens */}
            <div className="hidden sm:block rounded-xl border border-[var(--color-border)] overflow-hidden">
              {/* Header */}
              <div className="grid gap-3 px-4 py-2.5 bg-[var(--color-bg-muted)]
                border-b border-[var(--color-border)]
                text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider"
                style={{ gridTemplateColumns: '120px 200px 52px 1fr' }}>
                <span>Index</span>
                <span>Feature</span>
                <span className="text-center">Dims</span>
                <span>Description</span>
              </div>

              {FEATURE_ROWS.map((row, i) => {
                const c = COLOR_MAP[row.color]
                return (
                  <div
                    key={i}
                    className="grid gap-3 px-4 py-3 items-start
                      border-b border-[var(--color-border)] last:border-0
                      hover:bg-[var(--color-bg-muted)] transition-colors duration-150"
                    style={{ gridTemplateColumns: '120px 200px 52px 1fr',
                      background: i % 2 === 0 ? 'var(--color-card)' : 'var(--color-bg-muted)' }}
                  >
                    <span className="font-mono text-xs font-semibold text-teal">
                      {row.range}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                      <span className="font-display font-semibold text-xs text-[var(--color-text)]">
                        {row.type}
                      </span>
                    </div>
                    <span className={`font-mono font-bold text-sm text-center ${c.text}`}>
                      {row.dims}
                    </span>
                    <span className="text-xs font-body text-[var(--color-text-muted)] leading-relaxed">
                      {row.desc}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Mobile fallback — simple list */}
            <div className="sm:hidden space-y-3">
              {FEATURE_ROWS.map((row, i) => {
                const c = COLOR_MAP[row.color]
                return (
                  <div key={i} className="flex gap-3 items-start p-3 rounded-xl
                    border border-[var(--color-border)] bg-[var(--color-card)]">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${c.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-semibold text-teal">
                          {row.range}
                        </span>
                        <span className={`font-mono text-[10px] font-bold ${c.text}`}>
                          {row.dims} dims
                        </span>
                      </div>
                      <p className="font-display font-semibold text-xs text-[var(--color-text)] mb-0.5">
                        {row.type}
                      </p>
                      <p className="text-xs font-body text-[var(--color-text-muted)] leading-relaxed">
                        {row.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* External links */}
        <motion.div
          className="flex flex-wrap gap-3 justify-center pb-4"
          initial={shouldReduce ? {} : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {[
            { label: 'Gene Ontology Consortium', href: 'https://geneontology.org' },
            { label: 'UniProtKB',                href: 'https://www.uniprot.org'  },
            { label: 'QuickGO',                  href: 'https://www.ebi.ac.uk/QuickGO' },
            { label: 'CAFA',                     href: 'https://www.biofunctionprediction.org/cafa' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                border border-[var(--color-border)] text-xs font-display font-semibold
                text-[var(--color-text-muted)] hover:text-teal hover:border-teal/30
                transition-colors duration-200"
            >
              {label} <ExternalLink size={11} />
            </a>
          ))}
        </motion.div>

      </div>
    </div>
  )
}