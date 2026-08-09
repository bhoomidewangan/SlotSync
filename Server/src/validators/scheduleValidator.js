const { TIMETABLE_TEMPLATE } = require('../constants/timetableTemplate')
const { scheduleProposalSchema } = require('../schemas/scheduleProposal')

class ScheduleValidationError extends Error {
  constructor(issues) {
    super(`Schedule proposal is invalid: ${issues.map((issue) => issue.message).join('; ')}`)
    this.name = 'ScheduleValidationError'
    this.code = 'INVALID_SCHEDULE_PROPOSAL'
    this.statusCode = 422
    this.issues = issues
  }
}

function idOf(value) {
  if (value && typeof value === 'object' && value._id !== undefined) {
    return String(value._id)
  }
  return value === undefined || value === null ? null : String(value)
}

function issue(code, message, path = []) {
  return { code, message, path }
}

function validateScheduleProposal(proposal, context) {
  const parsed = scheduleProposalSchema.safeParse(proposal)
  if (!parsed.success) {
    throw new ScheduleValidationError(parsed.error.errors.map((error) =>
      issue('INVALID_FORMAT', error.message, error.path)
    ))
  }

  const value = parsed.data
  const issues = []
  const semester = Number(context?.semester)
  const departmentId = idOf(context?.departmentId)
  const courses = Array.isArray(context?.courses) ? context.courses : []
  const blockedSlots = context?.teacherBlockedSlots || {}
  const validSlots = new Map(
    TIMETABLE_TEMPLATE.schedulableSlots.map((slot) => [slot.slotId, slot])
  )

  if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
    issues.push(issue('INVALID_CONTEXT', 'Validation context has an invalid semester.'))
  }
  if (!departmentId) {
    issues.push(issue('INVALID_CONTEXT', 'Validation context requires a department ID.'))
  }
  if (value.semester !== semester) {
    issues.push(issue(
      'SEMESTER_MISMATCH',
      `Proposal semester ${value.semester} does not match Semester ${semester}.`,
      ['semester']
    ))
  }

  const courseMap = new Map()
  for (const course of courses) {
    const courseId = idOf(course)
    const courseDepartmentId = idOf(course.department)
    const teacherId = idOf(course.teacher)
    const teacherDepartmentId = idOf(course.teacher?.department)

    if (!courseId || courseMap.has(courseId)) {
      issues.push(issue('DUPLICATE_OR_UNKNOWN_COURSE', 'Course context contains a missing or duplicate course ID.'))
      continue
    }
    if (Number(course.semester) !== semester || courseDepartmentId !== departmentId) {
      issues.push(issue(
        'COURSE_OWNERSHIP_MISMATCH',
        `Course ${courseId} does not belong to the selected semester and department.`
      ))
    }
    if (!teacherId) {
      issues.push(issue('UNKNOWN_TEACHER', `Course ${courseId} has no assigned teacher.`))
    } else if (teacherDepartmentId !== departmentId) {
      issues.push(issue(
        'TEACHER_OWNERSHIP_MISMATCH',
        `Teacher ${teacherId} does not belong to the authenticated department.`
      ))
    }

    courseMap.set(courseId, {
      teacherId,
      sessionsPerWeek: Number(course.sessionsPerWeek),
      periodsPerSession: Number(course.periodsPerSession),
    })
  }

  for (const [teacherId, slots] of Object.entries(blockedSlots)) {
    if (!Array.isArray(slots)) {
      issues.push(issue('INVALID_BLOCKED_SLOTS', `Blocked slots for teacher ${teacherId} must be an array.`))
      continue
    }
    for (const slotId of slots) {
      if (!validSlots.has(slotId)) {
        issues.push(issue('UNKNOWN_BLOCKED_SLOT', `Blocked slot ${slotId} is not part of the fixed timetable.`))
      }
    }
  }

  const sessionCount = new Map()
  const courseDays = new Set()
  const semesterSlots = new Set()
  const teacherSlots = new Set()

  value.sessions.forEach((session, sessionIndex) => {
    const path = ['sessions', sessionIndex]
    const course = courseMap.get(session.courseId)

    if (!course) {
      issues.push(issue('UNKNOWN_COURSE', `Unknown course ID ${session.courseId}.`, [...path, 'courseId']))
      return
    }
    if (session.teacherId !== course.teacherId) {
      issues.push(issue(
        'TEACHER_MISMATCH',
        `Teacher ${session.teacherId} is not assigned to course ${session.courseId}.`,
        [...path, 'teacherId']
      ))
    }

    sessionCount.set(session.courseId, (sessionCount.get(session.courseId) || 0) + 1)

    const courseDayKey = `${session.courseId}:${session.day}`
    if (courseDays.has(courseDayKey)) {
      issues.push(issue(
        'DUPLICATE_COURSE_DAY',
        `Course ${session.courseId} is scheduled more than once on ${session.day}.`,
        path
      ))
    }
    courseDays.add(courseDayKey)

    if (session.periods.length !== course.periodsPerSession || session.slotIds.length !== session.periods.length) {
      issues.push(issue(
        'SESSION_SIZE_MISMATCH',
        `Course ${session.courseId} requires ${course.periodsPerSession} consecutive period(s) per session.`,
        path
      ))
    }

    const periodNumbers = session.periods.map((period) => Number(period.slice(1)))
    const consecutive = periodNumbers.every((period, index) =>
      index === 0 || period === periodNumbers[index - 1] + 1
    )
    if (!consecutive) {
      issues.push(issue('NON_CONSECUTIVE_SESSION', 'Session periods must be consecutive.', [...path, 'periods']))
    }
    if (periodNumbers.includes(5) && periodNumbers.includes(6)) {
      issues.push(issue('LUNCH_BOUNDARY', 'A session cannot cross the lunch break.', [...path, 'periods']))
    }

    const localPeriods = new Set()
    const localSlots = new Set()
    session.periods.forEach((period, periodIndex) => {
      const slotId = session.slotIds[periodIndex]
      const slot = validSlots.get(slotId)

      if (localPeriods.has(period) || localSlots.has(slotId)) {
        issues.push(issue('DUPLICATE_SLOT_ID', 'A session contains a duplicate period or slot ID.', path))
      }
      localPeriods.add(period)
      localSlots.add(slotId)

      if (!slot || slot.day !== session.day || slot.period !== period) {
        issues.push(issue(
          'SLOT_MISMATCH',
          `Slot ${slotId} does not match ${session.day} ${period}.`,
          [...path, 'slotIds', periodIndex]
        ))
      }

      if (semesterSlots.has(slotId)) {
        issues.push(issue('SEMESTER_SLOT_CONFLICT', `More than one course uses ${slotId}.`, path))
      }
      semesterSlots.add(slotId)

      const teacherSlotKey = `${session.teacherId}:${slotId}`
      if (teacherSlots.has(teacherSlotKey)) {
        issues.push(issue('TEACHER_SLOT_CONFLICT', `Teacher ${session.teacherId} is assigned twice in ${slotId}.`, path))
      }
      teacherSlots.add(teacherSlotKey)

      if ((blockedSlots[session.teacherId] || []).includes(slotId)) {
        issues.push(issue(
          'TEACHER_BLOCKED',
          `Teacher ${session.teacherId} is unavailable in ${slotId}.`,
          path
        ))
      }
    })
  })

  for (const [courseId, course] of courseMap) {
    const actual = sessionCount.get(courseId) || 0
    if (actual !== course.sessionsPerWeek) {
      issues.push(issue(
        'SESSION_COUNT_MISMATCH',
        `Course ${courseId} requires exactly ${course.sessionsPerWeek} session(s), received ${actual}.`
      ))
    }
  }

  if (issues.length > 0) throw new ScheduleValidationError(issues)
  return value
}

module.exports = { ScheduleValidationError, validateScheduleProposal }
