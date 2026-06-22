/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // --- DARK MODE ACCENTS ---
        teal: {
          DEFAULT: '#00C9A7',
          light: '#00E5C3',
          dark: '#009E84',
        },
        cyan: {
          DEFAULT: '#00E5FF',
          light: '#66F0FF',
          dark: '#00B8CC',
        },
        violet: {
          DEFAULT: '#7C5CFC',
          light: '#9B80FD',
          dark: '#5B3EDB',
        },

        // --- LIGHT MODE ACCENTS ---
        deepteal: {
          DEFAULT: '#007A63',
          light: '#009E80',
          dark: '#005C4A',
        },
        navy: {
          DEFAULT: '#1A2B4A',
          light: '#243D66',
          dark: '#111D33',
        },
        indigo: {
          DEFAULT: '#6344D6',
          light: '#7C5CFC',
          dark: '#4A30B0',
        },

        // --- BASE SURFACES ---
        surface: {
          // Dark mode surfaces
          'dark-base':   '#0A0F1E', // deep space navy
          'dark-card':   '#111827', // slightly lighter card
          'dark-glass':  'rgba(17, 24, 39, 0.6)', // glassmorphism card bg

          // Light mode surfaces
          'light-base':  '#F8FAFC', // clean off-white
          'light-card':  '#FFFFFF',
          'light-muted': '#EFF2F7', // subtle section bg
        },

        // --- HIERARCHY / VALIDATION GOLD ---
        gold: {
          DEFAULT: '#F5A623',
          light:   '#F7BC57',
          dark:    '#C27D0E',
        },

        // --- NAMESPACE BADGE COLORS ---
        bp: '#3B82F6',   // blue  — Biological Process
        mf: '#10B981',   // green — Molecular Function
        cc: '#8B5CF6',   // purple — Cellular Component
      },

      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },

      backdropBlur: {
        navbar: '12px',
      },

      boxShadow: {
        'teal-glow':   '0 0 20px rgba(0, 201, 167, 0.35)',
        'cyan-glow':   '0 0 20px rgba(0, 229, 255, 0.35)',
        'violet-glow': '0 0 20px rgba(124, 92, 252, 0.35)',
        'gold-glow':   '0 0 16px rgba(245, 166, 35, 0.4)',
        'card-dark':   '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-light':  '0 4px 24px rgba(26, 43, 74, 0.08)',
      },

      animation: {
        'orb-drift': 'orbDrift 12s ease-in-out infinite alternate',
        'fade-up':   'fadeUp 0.4s ease forwards',
        'pulse-bar': 'pulseBar 1.5s ease-in-out infinite',
      },

      keyframes: {
        orbDrift: {
          '0%':   { transform: 'translate(0px, 0px) scale(1)' },
          '100%': { transform: 'translate(40px, -30px) scale(1.08)' },
        },
        fadeUp: {
          '0%':   { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseBar: {
          '0%, 100%': { opacity: 0.6 },
          '50%':      { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}