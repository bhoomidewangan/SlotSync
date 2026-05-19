/**
 * constraintChecker.js
 *
 * canPlace(day, startSlot, size, teacherId, courseId, grid, assignment)
 *
 * grid[day][slotIndex] = 'FREE' | 'LUNCH' | { courseId, teacherId }
 *
 * assignment tracks:
 *   - which days each course has already been placed on (no duplicate days)
 *   - which slots each teacher is occupied on each day (no double booking)
 */

function canPlace(day, startSlot, size, teacherId, courseId, grid, assignment) {
  // 1. Check all required slots exist and are FREE (not LUNCH, not taken)
  for (let i = startSlot; i < startSlot + size; i++) {
    const cell = grid[day][i]
    if (cell === undefined)   return false  // slot doesn't exist
    if (cell === 'LUNCH')     return false  // never place over lunch
    if (cell !== 'FREE')      return false  // already occupied
  }

  // 2. Teacher must not be busy on any of those slots that day
  const teacherDaySlots = assignment.teacherSlots[teacherId]?.[day] || []
  for (let i = startSlot; i < startSlot + size; i++) {
    if (teacherDaySlots.includes(i)) return false
  }

  // 3. Same course must not already appear on this day
  //    (spread sessions across different days)
  const courseDays = assignment.courseDays[courseId] || []
  if (courseDays.includes(day)) return false

  return true
}

function place(day, startSlot, size, teacherId, courseId, grid, assignment) {
  // Mark grid cells
  for (let i = startSlot; i < startSlot + size; i++) {
    grid[day][i] = { courseId, teacherId }
  }

  // Track teacher slots
  if (!assignment.teacherSlots[teacherId]) assignment.teacherSlots[teacherId] = {}
  if (!assignment.teacherSlots[teacherId][day]) assignment.teacherSlots[teacherId][day] = []
  for (let i = startSlot; i < startSlot + size; i++) {
    assignment.teacherSlots[teacherId][day].push(i)
  }

  // Track course days
  if (!assignment.courseDays[courseId]) assignment.courseDays[courseId] = []
  assignment.courseDays[courseId].push(day)
}

function unplace(day, startSlot, size, teacherId, courseId, grid, assignment) {
  // Free grid cells
  for (let i = startSlot; i < startSlot + size; i++) {
    grid[day][i] = 'FREE'
  }

  // Remove teacher slots
  const slots = assignment.teacherSlots[teacherId]?.[day] || []
  assignment.teacherSlots[teacherId][day] = slots.filter(
    s => s < startSlot || s >= startSlot + size
  )

  // Remove course day
  const days = assignment.courseDays[courseId] || []
  const idx = days.indexOf(day)
  if (idx !== -1) assignment.courseDays[courseId].splice(idx, 1)
}

module.exports = { canPlace, place, unplace }