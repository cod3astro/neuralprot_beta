import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import NeuralProtLogo from '../brand/NeuralProtLogo'
import ThemeToggle from '../ui/ThemeToggle'
import {
  Dna, BrainCircuit, BarChart3,
  BookOpen, Info, Home as HomeIcon
} from 'lucide-react'

const links = [
  { to: '/',         label: 'Home',     sub: 'Landing page',        icon: HomeIcon     },
  { to: '/predict',  label: 'Predict',  sub: 'Run predictions',     icon: Dna          },
  { to: '/compare',  label: 'Compare',  sub: 'Analyze two proteins',icon: BrainCircuit },
  { to: '/evaluate', label: 'Evaluate', sub: 'Benchmark performance',icon: BarChart3   },
  { to: '/docs',     label: 'Docs',     sub: 'How it works',        icon: BookOpen     },
  { to: '/about',    label: 'About',    sub: 'Project origins',     icon: Info         },
]

export default function MobileDrawer({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 right-0 z-50 h-full w-[80vw] max-w-sm
              bg-[var(--color-bg)] border-l border-[var(--color-border)]
              flex flex-col overflow-hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00C9A7 2px, #00C9A7 3px)', backgroundSize: '100% 6px' }}
            />
            <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
              <NeuralProtLogo size="sm" />
              <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--color-border)] hover:border-teal text-[var(--color-text-muted)] hover:text-teal transition-colors duration-200 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <nav className="relative z-10 flex flex-col gap-1 px-4 py-6 flex-1">
              {links.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.07, duration: 0.3 }}
                >
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex flex-col px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer
                      ${isActive
                        ? 'bg-teal/10 border border-teal/30 text-teal'
                        : 'border border-transparent text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="font-display font-semibold text-sm tracking-wide">
                          {link.label}
                        </span>
                        <span className={`text-xs mt-0.5 ${isActive ? 'text-teal/70' : 'text-[var(--color-text-muted)]'}`}>
                          {link.sub}
                        </span>
                      </>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </nav>
            <div className="relative z-10 px-6 py-5 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)] font-mono">v1.0.0-beta</span>
              <ThemeToggle />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}