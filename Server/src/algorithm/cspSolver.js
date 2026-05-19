/**
 * cspSolver.js
 *
 * Backtracking CSP solver with MRV heuristic.
 *
 * Input:
 *   sessions: [{ id, courseId, teacherId, size }]  — sorted hardest first
 *   grid:     { [day]: { [slotIndex]: 'FREE' | 'LUNCH' | {...} } }
 *   days:     ['Monday', 'Tuesday', ...]
 *   placeableSlots: [0, 1, 2, 3, 5, 6, 7]  — non-lunch slot indices
 *
 * Output:
 *   assignment map { sessionId: { day, startSlot } } or null if no solution
 */

const { canPlace, place, unplace } = require('./constraintChecker')

function solve(sessions, grid, days, placeableSlots, assignment) {
  // Base case: all sessions placed
  if (sessions.length === 0) return assignment

  const [session, ...rest] = sessions
  const { id, courseId, teacherId, size } = session

  // Try every day × startSlot combination
  for (const day of days) {
    for (const startSlot of placeableSlots) {
      // Make sure all slots in the range [startSlot, startSlot+size) are placeable
      // (i.e. no lunch slot sits in the middle of a multi-period session)
      const allInRange = []
      for (let i = startSlot; i < startSlot + size; i++) {
        allInRange.push(i)
      }
      const rangeValid = allInRange.every(s => placeableSlots.includes(s))
      if (!rangeValid) continue

      if (!canPlace(day, startSlot, size, teacherId, courseId, grid, assignment)) {
        continue
      }

      // Place
      place(day, startSlot, size, teacherId, courseId, grid, assignment)
      assignment.placed[id] = { day, startSlot }

      // Recurse
      const result = solve(rest, grid, days, placeableSlots, assignment)
      if (result) return result

      // Backtrack
      unplace(day, startSlot, size, teacherId, courseId, grid, assignment)
      delete assignment.placed[id]
    }
  }

  // No valid placement found for this session
  return null
}

/**
 * Main entry point for the solver.
 *
 * sessions are sorted by size DESC so larger blocks (harder to place)
 * are attempted first — this is the MRV heuristic.
 */
function runSolver(sessions, grid, days, placeableSlots) {
  // Sort: largest periodsPerSession first (hardest to fit)
  const sorted = [...sessions].sort((a, b) => b.size - a.size)

  const assignment = {
    placed: {},       // { sessionId: { day, startSlot } }
    teacherSlots: {}, // { teacherId: { day: [slotIndices] } }
    courseDays: {},   // { courseId: [days] }
  }

  return solve(sorted, grid, days, placeableSlots, assignment)
}

module.exports = { runSolver }