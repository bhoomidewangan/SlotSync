const test = require('node:test')
const assert = require('node:assert/strict')
const {
  inspectLegacySchedulingData,
  resetLegacySchedulingData,
} = require('../src/services/timetableMigrationService')

function harness() {
  const calls = []
  const legacyConfigs = {
    countDocuments: async () => 4,
    deleteMany: async (filter, options) => calls.push(['configs', filter, options]),
  }
  const models = {
    Timetable: {
      countDocuments: async () => 3,
      deleteMany: async (filter, options) => calls.push(['timetables', filter, options]),
      syncIndexes: async () => calls.push(['timetable-indexes']),
    },
    TeacherBooking: {
      countDocuments: async () => 8,
      deleteMany: async (filter, options) => calls.push(['bookings', filter, options]),
      syncIndexes: async () => calls.push(['booking-indexes']),
    },
  }
  const session = {
    withTransaction: async (work) => work(),
    endSession: async () => calls.push(['session-ended']),
  }
  return {
    calls,
    connection: { collection: () => legacyConfigs },
    models,
    mongooseClient: { startSession: async () => session },
  }
}

test('migration inspection is read-only and reports legacy record counts', async () => {
  const setup = harness()
  assert.deepEqual(await inspectLegacySchedulingData(setup), {
    timetables: 3,
    teacherBookings: 8,
    scheduleConfigs: 4,
  })
  assert.deepEqual(setup.calls, [])
})

test('development migration clears scheduling data transactionally before rebuilding indexes', async () => {
  const setup = harness()
  assert.deepEqual(await resetLegacySchedulingData(setup), {
    timetables: 3,
    teacherBookings: 8,
    scheduleConfigs: 4,
  })
  assert.deepEqual(setup.calls.map((call) => call[0]), [
    'bookings',
    'timetables',
    'configs',
    'timetable-indexes',
    'booking-indexes',
    'session-ended',
  ])
})
