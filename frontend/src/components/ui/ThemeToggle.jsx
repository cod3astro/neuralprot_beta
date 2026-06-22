import { motion } from 'motion/react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full flex items-center justify-center
        cursor-pointer border border-[var(--color-border)]
        bg-[var(--color-card)] hover:border-teal transition-colors duration-200"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -30, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 30, opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {isDark
          ? <Sun size={18} className="text-teal" />
          : <Moon size={18} className="text-deepteal" />
        }
      </motion.div>
    </motion.button>
  )
}