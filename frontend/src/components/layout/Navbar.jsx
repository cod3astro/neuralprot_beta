import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { Menu, Dna, BrainCircuit, BarChart3, BookOpen, Info, Home as HomeIcon } from 'lucide-react'
import NeuralProtLogo from '../brand/NeuralProtLogo'
import ThemeToggle from '../ui/ThemeToggle'
import MobileDrawer from './MobileDrawer'

const links = [
  { to: '/',         label: 'Home',     icon: HomeIcon  },
  { to: '/predict',  label: 'Predict',  icon: Dna       },
  { to: '/compare',  label: 'Compare',  icon: BrainCircuit },
  { to: '/evaluate', label: 'Evaluate', icon: BarChart3  },
  { to: '/docs',     label: 'Docs',     icon: BookOpen   },
  { to: '/about',    label: 'About',    icon: Info       },
]

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300
          ${scrolled
            ? 'py-2 border-b border-[var(--color-border)]'
            : 'py-3'
          }`}
        style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            backgroundColor: scrolled
            ? 'var(--navbar-scrolled-bg)'
            : 'var(--navbar-bg)',
}}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Scan-line texture — very subtle */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, #00C9A7 3px, #00C9A7 4px)',
            backgroundSize: '100% 8px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
          flex items-center justify-between gap-4">

          {/* ── Logo ── */}
          <NavLink to="/" className="flex-shrink-0">
            <NeuralProtLogo size="sm" />
          </NavLink>

          {/* ── Desktop nav links ── */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className="group relative"
              >
                {({ isActive }) => (
                  <div className={`
                    relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                    font-display font-medium text-sm tracking-wide
                    transition-all duration-200 cursor-pointer
                    ${isActive
                      ? 'text-teal bg-teal/10 border border-teal/25'
                      : 'text-[var(--color-text-muted)] border border-transparent hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'
                    }
                  `}>
                    <link.icon size={13} strokeWidth={2.2} />
                    {link.label}

                    {/* Active pulse dot */}
                    {isActive && (
                      <motion.span
                        className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-teal"
                        animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* ── Right side ── */}
          <div className="flex items-center gap-3">
            {/* Signal indicator — desktop only */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1
              rounded-full border border-[var(--color-border)]
              bg-[var(--color-bg-muted)]">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-teal"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <span className="text-[10px] font-mono text-[var(--color-text-muted)] tracking-widest uppercase">
                375 models live
              </span>
            </div>

            <ThemeToggle />

            {/* Hamburger — mobile only */}
            <motion.button
              className="md:hidden w-10 h-10 rounded-full flex items-center justify-center
                border border-[var(--color-border)] bg-[var(--color-card)]
                text-[var(--color-text-muted)] hover:border-teal hover:text-teal
                transition-colors duration-200 cursor-pointer"
              onClick={() => setDrawerOpen(true)}
              whileTap={{ scale: 0.92 }}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </motion.button>
          </div>
        </div>
      </motion.header>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}