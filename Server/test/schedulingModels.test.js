const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')

const TeacherBooking = require('../src/models/TeacherBooking')
const Timetable = require('../src/models/Timetable')

function hasUniqueIndex(schema, expectedFields) {
  return schema.indexes().some(([fields, options]) =>
    options.unique === true &&
    JSON.stringify(fields) === JSON.stringify(expectedFields)
  )
}

test('TeacherBooking stores booking ownership and fixed-template slot details', () => {
  const booking = new TeacherBooking({
    department: new mongoose.Types.ObjectId(),
    teacher: new mongoose.Types.ObjectId(),
    timetable: new mongoose.Types.ObjectId(),
    semester: 3,
    course: new mongoose.Types.ObjectId(),
    day: 'Tuesday',
    period: 'P7',
    slotId: 'TUE_P7',
  })

  assert.equal(booking.validateSync(), undefined)
  assert.ok(TeacherBooking.schema.path('department'))
  assert.ok(TeacherBooking.schema.path('teacher'))
  assert.ok(TeacherBooking.schema.path('timetable'))
  assert.ok(TeacherBooking.schema.path('semester'))
  assert.ok(TeacherBooking.schema.path('course'))
  assert.ok(TeacherBooking.schema.path('day'))
  assert.ok(TeacherBooking.schema.path('period'))
  assert.ok(TeacherBooking.schema.path('slotId'))
})

test('TeacherBooking rejects slots outside the fixed timetable', () => {
  const booking = new TeacherBooking({
    department: new mongoose.Types.ObjectId(),
    teacher: new mongoose.Types.ObjectId(),
    timetable: new mongoose.Types.ObjectId(),
    semester: 3,
    course: new mongoose.Types.ObjectId(),
    day: 'Saturday',
    period: 'P11',
    slotId: 'SAT_P11',
  })

  const error = booking.validateSync()
  assert.ok(error.errors.day)
  assert.ok(error.errors.period)
  assert.ok(error.errors.slotId)
})

test('TeacherBooking has the cross-semester teacher conflict index', () => {
  assert.equal(
    hasUniqueIndex(TeacherBooking.schema, {
      department: 1,
      teacher: 1,
      day: 1,
      period: 1,
    }),
    true
  )
})

test('Timetable represents an accepted timetable and is unique per semester', () => {
  const timetable = new Timetable({
    department: new mongoose.Types.ObjectId(),
    semester: 4,
    schedule: { days: [], slots: [], schedule: {} },
  })

  assert.equal(timetable.validateSync(), undefined)
  assert.ok(timetable.generatedAt instanceof Date)
  assert.ok(timetable.acceptedAt instanceof Date)
  assert.equal(
    hasUniqueIndex(Timetable.schema, { department: 1, semester: 1 }),
    true
  )
})
