const TeacherBooking = require('../models/TeacherBooking')
const Timetable = require('../models/Timetable')

async function inspectLegacySchedulingData({ connection, models = {} }) {
  const TimetableModel = models.Timetable || Timetable
  const TeacherBookingModel = models.TeacherBooking || TeacherBooking
  const legacyConfigs = connection.collection('scheduleconfigs')
  const [timetables, teacherBookings, scheduleConfigs] = await Promise.all([
    TimetableModel.countDocuments(),
    TeacherBookingModel.countDocuments(),
    legacyConfigs.countDocuments(),
  ])
  return { timetables, teacherBookings, scheduleConfigs }
}

async function resetLegacySchedulingData({ connection, models = {}, mongooseClient }) {
  const TimetableModel = models.Timetable || Timetable
  const TeacherBookingModel = models.TeacherBooking || TeacherBooking
  const legacyConfigs = connection.collection('scheduleconfigs')
  const before = await inspectLegacySchedulingData({ connection, models })
  const session = await mongooseClient.startSession()

  try {
    await session.withTransaction(async () => {
      await TeacherBookingModel.deleteMany({}, { session })
      await TimetableModel.deleteMany({}, { session })
      await legacyConfigs.deleteMany({}, { session })
    })
    await TimetableModel.syncIndexes()
    await TeacherBookingModel.syncIndexes()
    return before
  } finally {
    await session.endSession()
  }
}

module.exports = { inspectLegacySchedulingData, resetLegacySchedulingData }
