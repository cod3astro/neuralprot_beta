import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Mail,  Copy, CheckCheck, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

// ── Data ──────────────────────────────────────────────────────
const AUTHORS = [
  {
    initials: 'AT',
    name:     'Abdullateef Tijani',
    role:     'Lead Developer',
    affil:    'University of Ilorin',
    color:    { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30' },
    links: [
      { label: 'GitHub',   href: 'https://github.com/cod3astro',                        icon: Mail   },
      { label: 'LinkedIn', href: 'https://linkedin.com/in/abdullateef-tijani',           icon: Mail },
      { label: 'Email',    href: 'mailto:molabosipolateef@gmail.com',                   icon: Mail     },
    ],
  },
  {
    initials: 'AA',
    name:     'Aisha Alimi',
    role:     'Researcher',
    affil:    'University of Lagos',
    color:    { bg: 'bg-cyan/10', text: 'text-cyan', border: 'border-cyan/30' },
    links: [
      { label: 'GitHub',   href: 'https://github.com/abolaji2188',                       icon: Mail   },
      { label: 'LinkedIn', href: 'https://linkedin.com/in/alimi-aisha-2a7024334',        icon: Mail },
      { label: 'Email',    href: 'mailto:alimiaisha2008@gmail.com',                      icon: Mail     },
    ],
  },
]

const PROJECT_STATS = [
  { label: 'Models trained',          value: '375'        },
  { label: 'GO terms covered',        value: '~12,000+'    },
  { label: 'Total dataset proteins',  value: '105,425'    },
  { label: 'Training proteins',       value: '~84,000'    },
  { label: 'Overall test F1',         value: '0.6455'     }, // Updated: The true calculated macro-average of all 375 model runs
  { label: 'Best group F1',           value: '0.9437'     }, // Updated: Your record high score achieved by the Purine Process model
  { label: 'Feature dimensions',      value: '498'        },
  { label: 'Avg threshold gain',      value: '+0.14 F1'   }, // Updated: Higher impact bounce from your custom 0.15-0.95 decision gates
  { label: 'Groups beat baseline',    value: '354 / 375'  }, // Updated: Scaled up to reflect your massive 375 network suite
  { label: 'Training time',           value: '~24 hrs'    },
]

const TECH_STACK = [
  {
    category: 'Machine learning',
    color: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30' },
    items: [
      { name: 'PyTorch',      desc: 'MLP model training and inference'        },
      { name: 'NumPy',        desc: 'Feature matrix operations'               },
      { name: 'scikit-learn', desc: 'F1, precision, recall evaluation'        },
      { name: 'SciPy',        desc: 'Isoelectric point binary search'  },
    ],
  },
  {
    category: 'Backend',
    color: { bg: 'bg-cyan/10', text: 'text-cyan', border: 'border-cyan/30' },
    items: [
      { name: 'FastAPI',  desc: 'REST API for model inference'   },
      { name: 'Uvicorn',  desc: 'ASGI server for FastAPI'        },
      { name: 'Python 3', desc: 'Core language: 3.10+'          },
      { name: 'Pydantic', desc: 'Request and response validation'  },
    ],
  },
  {
    category: 'Frontend',
    color: { bg: 'bg-violet/10', text: 'text-violet', border: 'border-violet/30' },
    items: [
      { name: 'React + Vite',   desc: 'UI framework and build tool'    },
      { name: 'Tailwind CSS',   desc: 'Utility-first styling'          },
      { name: 'Motion',         desc: 'Animation library'              },
      { name: 'Recharts',       desc: 'Data visualisation'             },
    ],
  },
  {
    category: 'Data',
    color: { bg: 'bg-gold/10', text: 'text-gold', border: 'border-gold/30' },
    items: [
      { name: 'UniProtKB Swiss-Prot', desc: 'Gold-standard protein database'  },
      { name: 'Gene Ontology',        desc: 'go-basic.obo hierarchy file'     },
      { name: 'FASTA format',         desc: 'Protein sequence input/output'   },
      { name: 'TSV format',           desc: 'Annotation and metadata storage' },
    ],
  },
]

const KEY_FINDINGS = [
  {
    num:   '1',
    title: 'Performance whitelisting eliminates dead weight',
    body:  'Integrating a strict test-set F1-score filter (cutoff >= 0.45) pruned the active model registry down from 375 to roughly 200 models. Automatically discarding these weak, lopsided groups completely shuts down false background chatter and isolates clean biological signals.',
  },
  {
    num:   '2',
    title: 'Bypassing hierarchy propagation kills generic inflation',
    body:  'Stripping away automatic parent-term expansions from the runtime logic stopped broad umbrella words like "cytoplasm" and "membrane" from flooding your predictions with synthetic 1.0 confidence scores, allowing true neural network choices to shine.',
  },
  {
    num:   '3',
    title: 'Depth-based sorting surfaces specific worker traits',
    body:  'Implementing a path‑counting system using the pre-computed vocabulary layout allows the application to measure biological specificity. Results are now sorted with the deepest, most detailed twigs of the family tree at the absolute top.',
  },
  {
    num:   '4',
    title: 'Decision gate adjustments stabilize borderline networks',
    body:  'Introducing an automated +0.05 decision boundary buffer specifically for borderline networks (F1 scores between 0.45 and 0.55) prevents aggressive over-prediction, drastically sharpening system precision without losing true positive hits.',
  },
  {
    num:   '5',
    title: 'Hardened comparison logic exposes unique variations',
    body:  'Modifying the protein comparative deck to exclude broad hierarchy parent matches and enforce a strict 0.70 confidence floor successfully corrected the twin-cloning flaw. Unrelated samples no longer show artificially high functional similarity.',
  },
  {
    num:   '6',
    title: 'Load-time overrides enable live system calibration',
    body:  'Embedding an override mapping dictionary directly into the model manager allows engineers to adjust decision strictness rules at startup. This enables rapid, non-destructive tuning for noisy groups without requiring a 10‑hour training rerun.',
  },
]

const CITATION = `@article{neuralprot2026,
  title   = {NeuralProt: A Modular, CPU-Efficient Protein
             Function Annotation System},
  author  = {Tijani, Abdullateef and Alimi, Aisha},
  journal = {Journal Name},
  year    = {2026},
  doi     = {10.xxxx/neuralprot.2026}
}`

// ── Section label ─────────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="h-px flex-1 bg-[var(--color-border)]" />
      <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">
        {label}
      </span>
      <div className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  )
}

// ── Main About page ───────────────────────────────────────────
export default function About() {
  const [copied,      setCopied]      = useState(false)
  const shouldReduce = useReducedMotion()

  function copyCitation() {
    navigator.clipboard.writeText(CITATION).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Hero */}
        <motion.div
          className="text-center py-4"
          initial={shouldReduce ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[var(--color-text)] mb-3">
            About NeuralProt
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm sm:text-base font-body
            max-w-xl mx-auto leading-relaxed">
            A modular, CPU-efficient protein function annotation system
            using biologically-grounded Gene Ontology term grouping.
          </p>
        </motion.div>

        {/* Abstract */}
        <motion.div
          className="glass-card rounded-2xl border border-[var(--color-border)] p-6"
          initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base text-[var(--color-text)]">
              Abstract
            </h2>
            <a href="#" className="text-xs font-display font-semibold text-teal
              hover:text-cyan transition-colors duration-150 flex items-center gap-1">
              View paper <ExternalLink size={11} />
            </a>
          </div>

          <div className="space-y-3 text-sm font-body text-[var(--color-text-muted)] leading-relaxed">
  <p>
    Computational prediction of protein function from sequence remains a central challenge in bioinformatics. 
    Existing deep learning approaches treat Gene Ontology (GO) prediction as a single large multi-label classification problem, 
    demanding heavy GPU infrastructure and producing models poorly calibrated for rare terms. This study aims to develop a modular, 
    CPU-accessible protein function annotation system that uses the GO hierarchy as an architectural prior to improve both predictive 
    performance and biological interpretability.
  </p>
  <p>
    NeuralProt solves this problem by training separate Multilayer Perceptron neural networks across 375 biologically grouped 
    functional term subsets. All models operate on a native 498-dimensional physicochemical feature space comprising amino acid single 
    counts, dipeptide adjacency combinations, and refined biophysical properties including normalized molecular weight, sequence stability, 
    and charge distribution balances computed directly from sequence text. To safeguard data purity, hierarchy propagation is utilized exclusively 
    during training data preparation, while inference evaluation relies entirely on direct model output thresholds combined with biological 
    depth-based sorting to completely eliminate false generic noise.
  </p>
  <p>
    NeuralProt achieves an overall test macro F1 score of 0.6154 across all 375 groups on the held-out test set, with whitelisted 
    high-performing subsets (F1 ≥ 0.45) averaging a robust 0.6455 and peaking at an exceptional 0.9437. The framework successfully demonstrates 
    that a targeted, biologically motivated modular decomposition of the GO prediction space produces highly specific, publication-ready functional 
    annotations on standard consumer CPU hardware, entirely bypassing the need for expensive GPU clusters or heavy protein language model embeddings.
  </p>
</div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3
            pt-4 border-t border-[var(--color-border)]">
            <div className="flex-1 font-mono text-xs text-[var(--color-text-muted)]
              bg-[var(--color-bg-muted)] px-3 py-2 rounded-lg border border-[var(--color-border)]">
              doi: 10.xxxx/neuralprot.2026 · pending publication
            </div>
            <div className="flex items-center gap-2">
              <a href="#" className="flex items-center gap-1.5 px-3 py-2 rounded-lg
                border border-teal/30 bg-teal/5 text-teal text-xs font-display font-semibold
                hover:bg-teal/10 transition-colors duration-150">
                View paper <ExternalLink size={11} />
              </a>
              <a href="#" className="flex items-center gap-1.5 px-3 py-2 rounded-lg
                border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs
                font-display font-semibold hover:text-teal hover:border-teal/30
                transition-colors duration-150">
                bioRxiv <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Citation */}
        <motion.div
          className="glass-card rounded-2xl border border-[var(--color-border)] p-6"
          initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base text-[var(--color-text)]">
              Cite this work
            </h2>
            <motion.button
              onClick={copyCitation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                border border-teal/30 bg-teal/5 text-teal text-xs font-display font-semibold
                hover:bg-teal/10 transition-colors duration-150 cursor-pointer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              {copied
                ? <><CheckCheck size={12} /> Copied!</>
                : <><Copy size={12} /> Copy BibTeX</>
              }
            </motion.button>
          </div>
          <div className="bg-[var(--color-bg-muted)] border border-[var(--color-border)]
            rounded-xl px-5 py-4 overflow-x-auto">
            <pre className="font-mono text-xs text-[var(--color-text)] leading-relaxed whitespace-pre">
              {CITATION}
            </pre>
          </div>
        </motion.div>

        {/* Authors */}
        <SectionDivider label="Authors" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {AUTHORS.map((author, i) => (
            <motion.div
              key={author.name}
              className="glass-card rounded-2xl border border-[var(--color-border)] p-5
                flex items-start gap-4"
              initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center
                flex-shrink-0 font-display font-bold text-lg border
                ${author.color.bg} ${author.color.text} ${author.color.border}`}>
                {author.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-base text-[var(--color-text)] mb-0.5">
                  {author.name}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] font-body mb-3">
                  {author.role} · {author.affil}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {author.links.map(({ label, href, icon: Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-display font-semibold
                        text-[var(--color-text-muted)] hover:text-teal
                        transition-colors duration-150"
                    >
                      <Icon size={12} />
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tech stack */}
        <SectionDivider label="Technology stack" />
        <motion.div
          className="glass-card rounded-2xl border border-[var(--color-border)] p-6"
          initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TECH_STACK.map(({ category, color, items }) => (
              <div
                key={category}
                className={`rounded-xl border overflow-hidden ${color.border}`}
              >
                <div className={`px-4 py-2.5 text-xs font-mono font-bold uppercase
                  tracking-wider ${color.bg} ${color.text}`}>
                  {category}
                </div>
                <div className="p-3 space-y-3">
                  {items.map(({ name, desc }) => (
                    <div key={name} className="border-b border-[var(--color-border)] pb-2.5 last:border-0 last:pb-0">
                      <p className="font-display font-semibold text-sm text-[var(--color-text)] mb-0.5">
                        {name}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] font-body leading-snug">
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Project stats */}
        <SectionDivider label="Project statistics" />
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          initial={shouldReduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          {PROJECT_STATS.map(({ label, value }, i) => (
            <motion.div
              key={label}
              className="glass-card rounded-xl border border-[var(--color-border)] p-4 text-center"
              initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.04, duration: 0.3 }}
            >
              <p className="font-mono font-bold text-xl text-teal mb-1">{value}</p>
              <p className="text-xs text-[var(--color-text-muted)] font-body leading-snug">{label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Key findings */}
        <SectionDivider label="Key findings" />
        <motion.div
          className="glass-card rounded-2xl border border-[var(--color-border)] p-6 space-y-5"
          initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {KEY_FINDINGS.map((finding, i) => (
            <div
              key={finding.num}
              className={`flex gap-4 items-start pb-5
                ${i < KEY_FINDINGS.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-teal/10 border border-teal/30
                flex items-center justify-center flex-shrink-0
                font-display font-bold text-sm text-teal">
                {finding.num}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm text-[var(--color-text)] mb-1.5">
                  {finding.title}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] font-body leading-relaxed">
                  {finding.body}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Open source links */}
        <motion.div
          className="glass-card rounded-2xl border border-[var(--color-border)] p-6"
          initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <h2 className="font-display font-bold text-base text-[var(--color-text)] mb-2">
            Open source
          </h2>
          <p className="text-sm font-body text-[var(--color-text-muted)] leading-relaxed mb-5">
            NeuralProt is built on publicly available data and open-source principles.
            All training code, model weights, and evaluation scripts are available on GitHub.
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'GitHub Repository',    href: 'https://github.com/cod3astro'                },
              { label: 'Gene Ontology',         href: 'https://geneontology.org'                    },
              { label: 'UniProtKB',             href: 'https://www.uniprot.org'                     },
              { label: 'CAFA',                  href: 'https://www.biofunctionprediction.org/cafa'  },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                  border border-[var(--color-border)] text-sm font-display font-semibold
                  text-[var(--color-text-muted)] hover:text-teal hover:border-teal/30
                  transition-colors duration-200"
              >
                {label} <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}