import { TIMETABLE_DAYS, TIMETABLE_DISPLAY_SLOTS } from '@/constants/timetableTemplate'

const DAY_CODES = Object.freeze({
  Monday: 'MON',
  Tuesday: 'TUE',
  Wednesday: 'WED',
  Thursday: 'THU',
  Friday: 'FRI',
})

function idOf(value) {
  if (value && typeof value === 'object' && value._id !== undefined) {
    return String(value._id)
  }
  return value === undefined || value === null ? null : String(value)
}

export function proposalToTimetable(proposal, courses = []) {
  if (!proposal) return null

  const courseMap = new Map(courses.map(course => [idOf(course), course]))
  const assignments = new Map()

  for (const session of proposal.sessions) {
    const course = courseMap.get(session.courseId)
    const teacher = course?.teacher

    session.slotIds.forEach((slotId, index) => {
      assignments.set(slotId, {
        course: {
          _id: session.courseId,
          name: course?.name || `Course ${session.courseId}`,
        },
        teacher: {
          _id: session.teacherId,
          name: teacher?.name || `Teacher ${session.teacherId}`,
        },
        isStart: index === 0,
        sessionSize: session.slotIds.length,
      })
    })
  }

  const schedule = Object.fromEntries(TIMETABLE_DAYS.map(day => [
    day,
    TIMETABLE_DISPLAY_SLOTS.map(slot => {
      if (slot.isLunch) return { ...slot, course: null, teacher: null }

      const slotId = `${DAY_CODES[day]}_${slot.period}`
      const assignment = assignments.get(slotId)
      return {
        ...slot,
        slotId,
        course: assignment?.course || null,
        teacher: assignment?.teacher || null,
        isStart: assignment?.isStart ?? null,
        sessionSize: assignment?.sessionSize ?? null,
      }
    }),
  ]))

  return {
    semester: proposal.semester,
    schedule: {
      days: [...TIMETABLE_DAYS],
      slots: TIMETABLE_DISPLAY_SLOTS.map(slot => ({ ...slot })),
      schedule,
    },
  }
}
