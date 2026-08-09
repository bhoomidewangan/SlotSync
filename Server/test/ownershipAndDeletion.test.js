const test = require('node:test')
const assert = require('node:assert/strict')
const { assertTeacherBelongsToDepartment } = require('../src/services/ownershipService')
const {
  assertCourseCanBeDeleted,
  assertTeacherCanBeDeleted,
  deleteTimetableWithBookings,
} = require('../src/services/deletionSafetyService')

function selected(value, capture) {
  return { select: async () => { capture?.(); return value } }
}

test('teacher ownership checks are scoped to the authenticated department', async () => {
  let filter
  const teacher = { _id: 'teacher-1' }
  assert.equal(await assertTeacherBelongsToDepartment({
    teacherId: 'teacher-1',
    departmentId: 'department-1',
    TeacherModel: { findOne: async (value) => { filter = value; return teacher } },
  }), teacher)
  assert.deepEqual(filter, { _id: 'teacher-1', department: 'department-1' })

  await assert.rejects(() => assertTeacherBelongsToDepartment({
    teacherId: 'teacher-2',
    departmentId: 'department-1',
    TeacherModel: { findOne: async () => null },
  }), (error) => error.statusCode === 400)
})

test('teacher and course deletion reject accepted scheduling references', async () => {
  await assert.rejects(() => assertTeacherCanBeDeleted({
    teacherId: 'teacher-1',
    departmentId: 'department-1',
    models: {
      Course: { findOne: () => selected({ _id: 'course-1' }) },
      TeacherBooking: { findOne: () => selected(null) },
    },
  }), (error) => error.statusCode === 409)

  let timetableFilter
  await assert.rejects(() => assertCourseCanBeDeleted({
    courseId: 'course-1',
    departmentId: 'department-1',
    models: {
      TeacherBooking: { findOne: () => selected({ _id: 'booking-1' }) },
      Timetable: {
        findOne: (filter) => {
          timetableFilter = filter
          return selected(null)
        },
      },
    },
  }), (error) => error.statusCode === 409)

  assert.equal(timetableFilter.department, 'department-1')
  assert.equal(timetableFilter.$or.length, 5)
})

test('timetable deletion removes only its department-owned bookings transactionally', async () => {
  const session = {
    withTransaction: async (work) => work(),
    endSession: async () => {},
  }
  let timetableFilter
  let bookingFilter
  const timetable = { _id: 'timetable-1' }

  const deleted = await deleteTimetableWithBookings({
    timetableId: 'timetable-1',
    departmentId: 'department-1',
    mongooseClient: { startSession: async () => session },
    models: {
      Timetable: {
        findOneAndDelete: async (filter, options) => {
          timetableFilter = filter
          assert.equal(options.session, session)
          return timetable
        },
      },
      TeacherBooking: {
        deleteMany: async (filter, options) => {
          bookingFilter = filter
          assert.equal(options.session, session)
        },
      },
    },
  })

  assert.equal(deleted, timetable)
  assert.deepEqual(timetableFilter, { _id: 'timetable-1', department: 'department-1' })
  assert.deepEqual(bookingFilter, { department: 'department-1', timetable: 'timetable-1' })
})
