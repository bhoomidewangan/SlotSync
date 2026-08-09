const test = require('node:test')
const assert = require('node:assert/strict')
const { acceptTimetableProposal } = require('../src/services/timetableAcceptanceService')

const proposal = {
  semester: 3,
  sessions: [{
    courseId: 'course-1',
    teacherId: 'teacher-1',
    day: 'Monday',
    periods: ['P1', 'P2'],
    slotIds: ['MON_P1', 'MON_P2'],
  }],
}

const courses = [{
  _id: 'course-1',
  name: 'Algorithms',
  teacher: { _id: 'teacher-1', name: 'Ada', department: 'department-1' },
  department: 'department-1',
  semester: 3,
  sessionsPerWeek: 1,
  periodsPerSession: 2,
}]

function transactionHarness() {
  const state = {
    timetable: { _id: 'old-timetable', schedule: 'old-schedule' },
    bookings: [{ timetable: 'old-timetable', slotId: 'FRI_P10' }],
  }
  let ended = false
  const session = {
    async withTransaction(work) {
      const snapshot = structuredClone(state)
      try {
        await work()
      } catch (error) {
        Object.assign(state, snapshot)
        throw error
      }
    },
    async endSession() { ended = true },
  }
  return { state, session, ended: () => ended }
}

test('accepts a proposal by replacing timetable bookings in one transaction', async () => {
  const harness = transactionHarness()
  const models = {
    Timetable: {
      async findOneAndUpdate(filter, update, options) {
        assert.equal(options.session, harness.session)
        harness.state.timetable = { _id: 'old-timetable', ...update.$set }
        return harness.state.timetable
      },
    },
    TeacherBooking: {
      async deleteMany(filter, options) {
        assert.equal(options.session, harness.session)
        harness.state.bookings = []
      },
      async insertMany(bookings, options) {
        assert.equal(options.session, harness.session)
        harness.state.bookings = bookings
      },
    },
  }

  const timetable = await acceptTimetableProposal({
    departmentId: 'department-1',
    semester: 3,
    proposal,
    generatedAt: '2026-08-06T10:00:00.000Z',
    contextLoader: async () => ({
      courses,
      existingTimetable: { _id: 'old-timetable' },
      teacherBlockedSlots: { 'teacher-1': [] },
    }),
    models,
    mongooseClient: { startSession: async () => harness.session },
    now: () => new Date('2026-08-06T10:05:00.000Z'),
  })

  assert.equal(timetable.schedule.schedule.Monday[0].course.name, 'Algorithms')
  assert.equal(timetable.schedule.schedule.Monday[1].isStart, false)
  assert.deepEqual(harness.state.bookings.map((booking) => booking.slotId), ['MON_P1', 'MON_P2'])
  assert.equal(harness.ended(), true)
})

test('transaction failure restores the previous timetable and bookings', async () => {
  const harness = transactionHarness()
  const oldState = structuredClone(harness.state)
  const models = {
    Timetable: {
      async findOneAndUpdate(filter, update) {
        harness.state.timetable = { _id: 'old-timetable', ...update.$set }
        return harness.state.timetable
      },
    },
    TeacherBooking: {
      async deleteMany() { harness.state.bookings = [] },
      async insertMany() { throw new Error('booking conflict') },
    },
  }

  await assert.rejects(() => acceptTimetableProposal({
    departmentId: 'department-1',
    semester: 3,
    proposal,
    generatedAt: '2026-08-06T10:00:00.000Z',
    contextLoader: async () => ({
      courses,
      existingTimetable: { _id: 'old-timetable' },
      teacherBlockedSlots: { 'teacher-1': [] },
    }),
    models,
    mongooseClient: { startSession: async () => harness.session },
  }), /booking conflict/)

  assert.deepEqual(harness.state, oldState)
  assert.equal(harness.ended(), true)
})

test('simultaneous acceptance attempts cannot create duplicate teacher bookings', async () => {
  let bookingClaimed = false
  const models = {
    Timetable: {
      findOneAndUpdate: async () => ({ _id: 'timetable-1' }),
    },
    TeacherBooking: {
      deleteMany: async () => {},
      insertMany: async () => {
        await Promise.resolve()
        if (bookingClaimed) {
          const error = new Error('duplicate teacher slot')
          error.code = 11000
          throw error
        }
        bookingClaimed = true
      },
    },
  }
  const mongooseClient = {
    startSession: async () => ({
      withTransaction: async (work) => work(),
      endSession: async () => {},
    }),
  }
  const input = {
    departmentId: 'department-1',
    semester: 3,
    proposal,
    generatedAt: '2026-08-06T10:00:00.000Z',
    contextLoader: async () => ({
      courses,
      existingTimetable: null,
      teacherBlockedSlots: { 'teacher-1': [] },
    }),
    models,
    mongooseClient,
  }

  const results = await Promise.allSettled([
    acceptTimetableProposal(input),
    acceptTimetableProposal(input),
  ])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(results.filter(result => result.status === 'rejected').length, 1)
})
