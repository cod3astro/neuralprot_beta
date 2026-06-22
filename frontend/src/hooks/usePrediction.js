import { useState, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL

/**
 * usePrediction
 *
 * Handles all calls to the NeuralProt backend.
 *
 * predict(sequence, extraParams)
 *   - sequence    : raw amino acid string
 *   - extraParams : optional object merged into the POST body
 *                   e.g. { f1_threshold: 0.70 } for the Strict preset
 *
 * The f1_threshold tells the backend which model groups to include:
 *   Broad    0.30  →  370 groups
 *   Balanced 0.45  →  334 groups
 *   Strict   0.70  →   96 groups
 */
export function usePrediction() {
  const [loading, setLoading]   = useState(false)
  const [results, setResults]   = useState(null)
  const [error,   setError]     = useState(null)

  // ── Single sequence prediction ──────────────────────────────────────────────
  const predict = useCallback(async (sequence, extraParams = {}) => {
    setLoading(true)
    setResults(null)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/predict/sequence`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence,
          top_n: 500,
          // Spread any extra params — this is how f1_threshold reaches the backend
          ...extraParams,
        }),
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.detail || `Server error ${response.status}`)
      }

      const data = await response.json()
      // Normalise: backend returns n_predictions; frontend uses total
      setResults({
        ...data,
        total:       data.n_predictions ?? data.total ?? 0,
        predictions: data.predictions   ?? [],
        modelsUsed:  data.modelsUsed    ?? null,
      })
    } catch (err) {
      setError(err.message || 'Prediction failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Batch FASTA prediction ──────────────────────────────────────────────────
  const predictBatch = useCallback(async (file) => {
    setLoading(true)
    setResults(null)
    setError(null)

    try {
      const form = new FormData()
      form.append('fasta_file', file)
      form.append('top_n', '500')

      const response = await fetch(`${API_URL}/predict/fasta`, {
        method: 'POST',
        body:   form,
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.detail || `Server error ${response.status}`)
      }

      const data = await response.json()
      setResults({
        ...data,
        total:       data.n_predictions ?? data.total ?? 0,
        predictions: data.predictions   ?? [],
      })
    } catch (err) {
      setError(err.message || 'Batch prediction failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  return { predict, predictBatch, loading, results, error }
}