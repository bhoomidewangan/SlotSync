const test = require('node:test')
const assert = require('node:assert/strict')

const {
  ScheduleValidationError,
  validateScheduleProposal,
} = require('../src/validators/scheduleValidator')

const departmentId = 'department-1'
const courses = [
  {
    _id: 'course-1',
    department: departmentId,
    semester: 3,
    teacher: { _id: 'teacher-1', department: departmentId },
    sessionsPerWeek: 2,
    periodsPerSession: 1,
  },
  {
    _id: 'course-2',
    department: departmentId,
    semester: 3,
    teacher: { _id: 'teacher-2', department: departmentId },
    sessionsPerWeek: 1,
    periodsPerSession: 2,
  },
]

const validProposal = {
  semester: 3,
  sessions: [
    { courseId: 'course-1', teacherId: 'teacher-1', day: 'Monday', periods: ['P1'], slotIds: ['MON_P1'] },
    { courseId: 'course-1', teacherId: 'teacher-1', day: 'Tuesday', periods: ['P2'], slotIds: ['TUE_P2'] },
    { courseId: 'course-2', teacherId: 'teacher-2', day: 'Wednesday', periods: ['P3', 'P4'], slotIds: ['WED_P3', 'WED_P4'] },
  ],
}

function context(overrides = {}) {
  return {
    semester: 3,
    departmentId,
    courses,
    teacherBlockedSlots: {},
    ...overrides,
  }
}

function issueCodes(error) {
  assert.ok(error instanceof ScheduleValidationError)
  return new Set(error.issues.map((item) => item.code))
}

test('accepts a complete fixed-template proposal', () => {
  assert.deepEqual(validateScheduleProposal(validProposal, context()), validProposal)
})

test('rejects unknown days, periods, slots, and extra response fields', () => {
  const invalid = structuredClone(validProposal)
  invalid.sessions[0].day = 'Saturday'
  invalid.sessions[0].periods = ['P11']
  invalid.sessions[0].slotIds = ['SAT_P11']
  invalid.unexpected = true

  assert.throws(
    () => validateScheduleProposal(invalid, context()),
    (error) => issueCodes(error).has('INVALID_FORMAT')
  )
})

test('rejects course ownership and assigned-teacher mismatches', () => {
  const invalid = structuredClone(validProposal)
  invalid.sessions[0].teacherId = 'teacher-2'

  assert.throws(
    () => validateScheduleProposal(invalid, context({
      courses: [{ ...courses[0], department: 'another-department' }, courses[1]],
    })),
    (error) => {
      const codes = issueCodes(error)
      return codes.has('COURSE_OWNERSHIP_MISMATCH') && codes.has('TEACHER_MISMATCH')
    }
  )
})

test('rejects teachers belonging to another department', () => {
  const isolatedCourses = structuredClone(courses)
  isolatedCourses[0].teacher.department = 'another-department'

  assert.throws(
    () => validateScheduleProposal(validProposal, context({ courses: isolatedCourses })),
    (error) => issueCodes(error).has('TEACHER_OWNERSHIP_MISMATCH')
  )
})

test('requires exact weekly session counts and one course session per day', () => {
  const invalid = structuredClone(validProposal)
  invalid.sessions[1].day = 'Monday'
  invalid.sessions[1].periods = ['P2']
  invalid.sessions[1].slotIds = ['MON_P2']
  invalid.sessions.pop()

  assert.throws(
    () => validateScheduleProposal(invalid, context()),
    (error) => {
      const codes = issueCodes(error)
      return codes.has('DUPLICATE_COURSE_DAY') && codes.has('SESSION_COUNT_MISMATCH')
    }
  )
})

test('rejects non-consecutive sessions and sessions crossing lunch', () => {
  const nonConsecutive = structuredClone(validProposal)
  nonConsecutive.sessions[2].periods = ['P2', 'P4']
  nonConsecutive.sessions[2].slotIds = ['WED_P2', 'WED_P4']

  assert.throws(
    () => validateScheduleProposal(nonConsecutive, context()),
    (error) => issueCodes(error).has('NON_CONSECUTIVE_SESSION')
  )

  const crossesLunch = structuredClone(validProposal)
  crossesLunch.sessions[2].periods = ['P5', 'P6']
  crossesLunch.sessions[2].slotIds = ['WED_P5', 'WED_P6']

  assert.throws(
    () => validateScheduleProposal(crossesLunch, context()),
    (error) => issueCodes(error).has('LUNCH_BOUNDARY')
  )
})

test('rejects semester slot conflicts and blocked teacher slots', () => {
  const invalid = structuredClone(validProposal)
  invalid.sessions[1].day = 'Wednesday'
  invalid.sessions[1].periods = ['P3']
  invalid.sessions[1].slotIds = ['WED_P3']

  assert.throws(
    () => validateScheduleProposal(invalid, context({
      teacherBlockedSlots: { 'teacher-1': ['WED_P3'] },
    })),
    (error) => {
      const codes = issueCodes(error)
      return codes.has('SEMESTER_SLOT_CONFLICT') && codes.has('TEACHER_BLOCKED')
    }
  )
})

test('rejects slot IDs that do not match their day and period', () => {
  const invalid = structuredClone(validProposal)
  invalid.sessions[0].slotIds = ['TUE_P1']

  assert.throws(
    () => validateScheduleProposal(invalid, context()),
    (error) => issueCodes(error).has('SLOT_MISMATCH')
  )
})
