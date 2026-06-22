export default function NeuralProtLogo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { icon: 28, text: 'text-lg', badge: 'text-[9px] px-1.5 py-0.5' },
    md: { icon: 36, text: 'text-xl', badge: 'text-[10px] px-2 py-0.5' },
    lg: { icon: 48, text: 'text-3xl', badge: 'text-xs px-2 py-1' },
  }

  const s = sizes[size]

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* SVG Icon — DNA helix + neural network nodes */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* DNA helix — left strand */}
        <path
          d="M10 4 C10 10, 18 12, 18 18 C18 24, 10 26, 10 32"
          stroke="#00C9A7"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* DNA helix — right strand */}
        <path
          d="M18 4 C18 10, 10 12, 10 18 C10 24, 18 26, 18 32"
          stroke="#00C9A7"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* DNA rungs */}
        <line x1="10" y1="9"  x2="18" y2="9"  stroke="#00C9A7" strokeWidth="1.2" strokeOpacity="0.5" />
        <line x1="10" y1="18" x2="18" y2="18" stroke="#00C9A7" strokeWidth="1.2" strokeOpacity="0.5" />
        <line x1="10" y1="27" x2="18" y2="27" stroke="#00C9A7" strokeWidth="1.2" strokeOpacity="0.5" />

        {/* Neural network nodes — right side */}
        {/* Top node */}
        <circle cx="28" cy="8"  r="2.5" fill="#00E5FF" />
        {/* Mid-left node */}
        <circle cx="23" cy="18" r="2.5" fill="#7C5CFC" />
        {/* Bottom node */}
        <circle cx="28" cy="28" r="2.5" fill="#00E5FF" />

        {/* Neural edges */}
        <line x1="28" y1="8"  x2="23" y2="18" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="28" y1="28" x2="23" y2="18" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="28" y1="8"  x2="28" y2="28" stroke="#7C5CFC" strokeWidth="1" strokeOpacity="0.4" />

        {/* Bridge connecting helix to neural net */}
        <line x1="18" y1="18" x2="23" y2="18" stroke="#00C9A7" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="2 2" />
      </svg>

      {showText && (
        <div className="flex items-center gap-2">
          <span
            className={`font-display font-bold tracking-tight ${s.text} text-[var(--color-text)]`}
          >
            NeuralProt
          </span>
          <span
            className={`${s.badge} rounded-full font-display font-semibold uppercase tracking-wide
              bg-teal/15 text-teal border border-teal/30`}
          >
            Beta
          </span>
        </div>
      )}
    </div>
  )
}