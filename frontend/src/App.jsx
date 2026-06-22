import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useLocation } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Home from './pages/Home'
import Predict from './pages/Predict' 
import Compare from './pages/Compare'
import Evaluate from './pages/Evaluate'
import Docs from './pages/Docs'
import About from './pages/About'

// Placeholder pages — we'll build each one properly later
const PlaceholderPage = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center pt-20">
    <h1 className="font-display text-3xl font-bold text-[var(--color-text)]">
      {title}
    </h1>
  </div>
)

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/evaluate" element={<Evaluate />} />
          <Route path="/docs"     element={<Docs />} />
          <Route path="/about"    element={<About />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Navbar />
        <AnimatedRoutes />
      </div>
    </BrowserRouter>
  )
}