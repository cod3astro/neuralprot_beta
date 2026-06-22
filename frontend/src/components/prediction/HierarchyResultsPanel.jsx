// src/components/prediction/HierarchyResultsPanel.jsx
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function HierarchyResultsPanel({ hierarchy, predictions }) {
  // Build a simple tree – in reality you'd traverse the GO graph
  // For demo, we'll group predictions by namespace and show parent-child if available
  const [expanded, setExpanded] = useState({})
  
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  
  // Group by namespace
  const grouped = {
    MF: predictions.filter(p => p.namespace === 'MF'),
    BP: predictions.filter(p => p.namespace === 'BP'),
    CC: predictions.filter(p => p.namespace === 'CC'),
  }
  
  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([ns, terms]) => (
        terms.length > 0 && (
          <div key={ns} className="glass-card rounded-xl border border-[var(--color-border)] p-4">
            <h3 className="font-display font-semibold text-lg text-[var(--color-text)] mb-3">{ns}</h3>
            <div className="space-y-2">
              {terms.map(term => (
                <div key={term.go_term} className="ml-4">
                  <button onClick={() => toggle(term.go_term)} className="flex items-center gap-1 text-sm text-teal font-mono">
                    {expanded[term.go_term] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {term.go_term}
                  </button>
                  {expanded[term.go_term] && (
                    <div className="ml-6 mt-1 pl-2 border-l-2 border-teal/30">
                      <p className="text-xs text-[var(--color-text-muted)]">{term.name}</p>
                      <p className="text-xs text-teal mt-1">Confidence: {Math.round(term.confidence * 100)}%</p>
                      {hierarchy[term.go_term]?.parent && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">Parent: {hierarchy[term.go_term].parent}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  )
}