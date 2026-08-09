const { TIMETABLE_TEMPLATE } = require('../constants/timetableTemplate')

function idOf(value) {
  if (value && typeof value === 'object' && value._id !== undefined) return String(value._id)
  return String(value)
}

function formatProposalSchedule(proposal, courses) {
  const courseMap = new Map(courses.map((course) => [idOf(course), course]))
  const assignments = new Map()

  for (const session of proposal.sessions) {
    const course = courseMap.get(session.courseId)
    session.slotIds.forEach((slotId, index) => {
      assignments.set(slotId, {
        course: { _id: course._id, name: course.name },
        teacher: { _id: course.teacher._id, name: course.teacher.name },
        isStart: index === 0,
        sessionSize: session.slotIds.length,
      })
    })
  }

  const days = TIMETABLE_TEMPLATE.days.map((day) => day.name)
  const slots = TIMETABLE_TEMPLATE.displaySlots.map((slot) => ({ ...slot }))
  const schedule = {}

  for (const day of TIMETABLE_TEMPLATE.days) {
    schedule[day.name] = slots.map((slot) => {
      if (slot.isLunch) return { ...slot, course: null, teacher: null }
      const assignment = assignments.get(`${day.code}_${slot.period}`)
      return {
        ...slot,
        slotId: `${day.code}_${slot.period}`,
        course: assignment?.course || null,
        teacher: assignment?.teacher || null,
        isStart: assignment?.isStart ?? null,
        sessionSize: assignment?.sessionSize ?? null,
      }
    })
  }

  return { days, slots, schedule }
}

function proposalToBookings({ proposal, courses, departmentId, timetableId, semester }) {
  const courseMap = new Map(courses.map((course) => [idOf(course), course]))
  return proposal.sessions.flatMap((scheduledSession) => {
    const course = courseMap.get(scheduledSession.courseId)
    return scheduledSession.slotIds.map((slotId, index) => ({
      department: departmentId,
      teacher: course.teacher._id,
      timetable: timetableId,
      semester: Number(semester),
      course: course._id,
      day: scheduledSession.day,
      period: scheduledSession.periods[index],
      slotId,
    }))
  })
}

module.exports = { formatProposalSchedule, proposalToBookings }
