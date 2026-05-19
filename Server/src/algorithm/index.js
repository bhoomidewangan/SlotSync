/**
 * algorithm/index.js
 *
 * Takes a fully populated ScheduleConfig and returns a structured schedule:
 * {
 *   days: ['Monday', ...],
 *   slots: [{ index, label, isLunch }, ...],
 *   schedule: {
 *     Monday: [
 *       { index: 0, label: '08:00 - 08:50', isLunch: false, course: null },
 *       { index: 1, label: '08:50 - 09:40', isLunch: false, course: { name, _id }, teacher: { name, _id } },
 *       { index: 4, label: 'Lunch Break',   isLunch: true,  course: null },
 *       ...
 *     ],
 *     Tuesday: [...],
 *   }
 * }
 *
 * Returns null if no valid schedule can be found.
 */

const { buildSlots, getPlaceableSlotIndices } = require('./slotBuilder')
const { runSolver } = require('./cspSolver')

function buildInitialGrid(days, slots) {
  const grid = {}
  for (const day of days) {
    grid[day] = {}
    for (const slot of slots) {
      grid[day][slot.index] = slot.isLunch ? 'LUNCH' : 'FREE'
    }
  }
  return grid
}

function buildSessions(courses) {
  /**
   * Each course contributes (sessionsPerWeek) sessions.
   * Each session has a size = periodsPerSession.
   *
   * e.g. Data Structures: 3 sessions/week, 1 period each → 3 sessions of size 1
   *      Database Mgmt:   2 sessions/week, 2 periods each → 2 sessions of size 2
   */
  const sessions = []
  for (const course of courses) {
    for (let i = 0; i < course.sessionsPerWeek; i++) {
      sessions.push({
        id: `${course._id}-${i}`,
        courseId: String(course._id),
        teacherId: String(course.teacher._id),
        size: course.periodsPerSession,
        // Keep refs for output
        course: { _id: course._id, name: course.name },
        teacher: { _id: course.teacher._id, name: course.teacher.name },
      })
    }
  }
  return sessions
}

function formatSchedule(days, slots, grid, sessions, assignment) {
  /**
   * Convert the flat assignment map back into a
   * structured day → [slot cells] format for the frontend.
   */

  // Build a lookup: "day-slotIndex" → session info
  const cellLookup = {}
  for (const session of sessions) {
    const placed = assignment.placed[session.id]
    if (!placed) continue
    const { day, startSlot } = placed
    for (let i = startSlot; i < startSlot + session.size; i++) {
      const key = `${day}-${i}`
      cellLookup[key] = {
        course: session.course,
        teacher: session.teacher,
        // Mark continuation slots so the frontend can merge cells
        isStart: i === startSlot,
        sessionSize: session.size,
      }
    }
  }

  const schedule = {}
  for (const day of days) {
    schedule[day] = slots.map(slot => {
      if (slot.isLunch) {
        return { ...slot, course: null, teacher: null }
      }
      const key = `${day}-${slot.index}`
      const cell = cellLookup[key] || null
      return {
        ...slot,
        course:  cell?.course  || null,
        teacher: cell?.teacher || null,
        isStart: cell?.isStart ?? null,
        sessionSize: cell?.sessionSize ?? null,
      }
    })
  }

  return schedule
}

function generateSchedule(config) {
  const courses = config.courses

  if (!courses || courses.length === 0) {
    throw new Error('No courses found in this config. Add courses to the semester first.')
  }

  // Validate all courses have a teacher populated
  for (const course of courses) {
    if (!course.teacher || !course.teacher._id) {
      throw new Error(`Course "${course.name}" has no teacher assigned.`)
    }
  }

  // Step 1: Build slot matrix
  const { slots, days } = buildSlots(config)
  const placeableSlots = getPlaceableSlotIndices(slots)

  // Step 2: Validate feasibility before running solver
  const totalPeriodsPerDay = placeableSlots.length
  const totalSlotsAvailable = days.length * totalPeriodsPerDay

  const totalPeriodsNeeded = courses.reduce(
    (sum, c) => sum + c.sessionsPerWeek * c.periodsPerSession, 0
  )

  if (totalPeriodsNeeded > totalSlotsAvailable) {
    throw new Error(
      `Not enough slots: need ${totalPeriodsNeeded} periods but only ` +
      `${totalSlotsAvailable} available (${days.length} days × ${totalPeriodsPerDay} periods). ` +
      `Reduce sessions per week or add more working days.`
    )
  }

  // Also check: each course's sessionsPerWeek must not exceed number of working days
  for (const course of courses) {
    if (course.sessionsPerWeek > days.length) {
      throw new Error(
        `Course "${course.name}" needs ${course.sessionsPerWeek} sessions/week ` +
        `but only ${days.length} working days are configured.`
      )
    }
  }

  // Step 3: Build sessions list and initial grid
  const sessions = buildSessions(courses)
  const grid = buildInitialGrid(days, slots)

  // Step 4: Run CSP solver
  const assignment = runSolver(sessions, grid, days, placeableSlots)

  if (!assignment) {
    throw new Error(
      'Could not fit all courses into the timetable. ' +
      'Try adding more working days, reducing sessions per week, or reducing periods per session.'
    )
  }

  // Step 5: Format output
  const schedule = formatSchedule(days, slots, grid, sessions, assignment)

  return { days, slots, schedule }
}

module.exports = { generateSchedule }