// src/hooks/useSequenceValidator.js
import { useState, useCallback } from 'react'

const IUPAC_REGEX = /^[ACDEFGHIKLMNPQRSTVWY]+$/i

export function useSequenceValidator() {
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState(null)

  const validate = useCallback((sequence) => {
    const cleaned = sequence.replace(/\s/g, '').toUpperCase()
    if (!cleaned) {
      setIsValid(false)
      setError(null)
      return
    }
    if (IUPAC_REGEX.test(cleaned)) {
      setIsValid(true)
      setError(null)
    } else {
      setIsValid(false)
      setError('Invalid characters. Use standard IUPAC single-letter codes (A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y).')
    }
  }, [])

  return { isValid, error, validate }
}