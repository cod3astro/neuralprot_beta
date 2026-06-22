import { motion } from 'motion/react'
import { Dna, FlaskConical, Home } from 'lucide-react'

const OPTIONS = [
  { value: 'All', label: 'All',     icon: null         },
  { value: 'BP',  label: 'BP',      icon: Dna,          sub: 'Biological Process' },
  { value: 'MF',  label: 'MF',      icon: FlaskConical, sub: 'Molecular Function' },
  { value: 'CC',  label: 'CC',      icon: Home,         sub: 'Cellular Component' },
]

const activeColors = {
  All: 'border-teal/40 bg-teal/10 text-teal',
  BP:  'border-bp/40  bg-bp/10  text-bp',
  MF:  'border-mf/40  bg-mf/10  text-mf',
  CC:  'border-cc/40  bg-cc/10  text-cc',
}

export default function NamespaceFilter({ active = 'All', onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
     
      {OPTIONS.map(opt => {
        const isActive = active === opt.value
        const Icon = opt.icon

        return (
          <motion.button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5
              rounded-full border text-xs font-display font-semibold
              transition-colors duration-200 cursor-pointer
              ${isActive
                ? activeColors[opt.value]
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {Icon && <Icon size={11} strokeWidth={2.5} />}
            {opt.label}
            {opt.sub && isActive && (
              <span className="hidden sm:inline font-body font-normal opacity-70">
                — {opt.sub}
              </span>
            )}
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full opacity-20"
                layoutId="namespace-active"
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}