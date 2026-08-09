const test = require('node:test')
const assert = require('node:assert/strict')
const { loadSchedulingContext } = require('../src/services/schedulingContextService')

test('loads only involved teacher bookings and excludes the target timetable', async () => {
  let courseFilter
  let bookingFilter
  const existingTimetable = { _id: 'old-timetable' }
  const models = {
    Course: {
      find(filter) {
        courseFilter = filter
        return {
          populate: async () => [
            { _id: 'course-1', teacher: { _id: 'teacher-1' } },
            { _id: 'course-2', teacher: { _id: 'teacher-1' } },
            { _id: 'course-3', teacher: { _id: 'teacher-2' } },
          ],
        }
      },
    },
    Timetable: { findOne: async () => existingTimetable },
    TeacherBooking: {
      find(filter) {
        bookingFilter = filter
        return {
          select: async () => [
            { teacher: 'teacher-1', slotId: 'MON_P1' },
            { teacher: 'teacher-1', slotId: 'MON_P1' },
            { teacher: 'teacher-2', slotId: 'TUE_P2' },
          ],
        }
      },
    },
  }

  const result = await loadSchedulingContext({
    departmentId: 'department-1',
    semester: 3,
    models,
  })

  assert.deepEqual(courseFilter, { department: 'department-1', semester: 3 })
  assert.deepEqual(bookingFilter, {
    department: 'department-1',
    teacher: { $in: ['teacher-1', 'teacher-2'] },
    timetable: { $ne: 'old-timetable' },
  })
  assert.deepEqual(result.teacherBlockedSlots, {
    'teacher-1': ['MON_P1'],
    'teacher-2': ['TUE_P2'],
  })
})
