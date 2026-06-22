// CRITICAL: Always sort by predicted_by first (Neural Network before Hierarchy),
// then by confidence score descending within each group.
// NEVER sort purely by score — hierarchy rules always return 1.0000 and would
// wrongly bury the AI predictions.

export function sortResults(results) {
  return [...results].sort((a, b) => {
    const isAI = (r) =>
      r.predicted_by === 'Neural Network AI' || r.predicted_by === 'Neural Network'
    const groupDiff = (isAI(b) ? 0 : 1) - (isAI(a) ? 0 : 1)
    if (groupDiff !== 0) return groupDiff
    const scoreA = a.confidence ?? a.threshold ?? 0
    const scoreB = b.confidence ?? b.threshold ?? 0
    return scoreB - scoreA
  })
}