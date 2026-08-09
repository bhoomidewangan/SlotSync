const mongoose = require('mongoose')
const Course = require('../models/Course')
const TeacherBooking = require('../models/TeacherBooking')
const Timetable = require('../models/Timetable')

const TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function conflict(message) {
  const error = new Error(message)
  error.statusCode = 409
  return error
}

async function assertTeacherCanBeDeleted({ teacherId, departmentId, models = {} }) {
  const CourseModel = models.Course || Course
  const TeacherBookingModel = models.TeacherBooking || TeacherBooking
  const [course, booking] = await Promise.all([
    CourseModel.findOne({ department: departmentId, teacher: teacherId }).select('_id'),
    TeacherBookingModel.findOne({ department: departmentId, teacher: teacherId }).select('_id'),
  ])
  if (course || booking) {
    throw conflict('This teacher is used by courses or an accepted timetable. Update those records before deleting the teacher.')
  }
}

async function assertCourseCanBeDeleted({ courseId, departmentId, models = {} }) {
  const TeacherBookingModel = models.TeacherBooking || TeacherBooking
  const TimetableModel = models.Timetable || Timetable
  const timetableCourseFilters = TIMETABLE_DAYS.map((day) => ({
    [`schedule.schedule.${day}.course._id`]: courseId,
  }))
  const [booking, timetable] = await Promise.all([
    TeacherBookingModel.findOne({ department: departmentId, course: courseId }).select('_id'),
    TimetableModel.findOne({ department: departmentId, $or: timetableCourseFilters }).select('_id'),
  ])
  if (booking || timetable) {
    throw conflict('This course is used by an accepted timetable. Replace or delete that timetable before deleting the course.')
  }
}

async function deleteTimetableWithBookings({
  timetableId,
  departmentId,
  models = {},
  mongooseClient = mongoose,
}) {
  const TimetableModel = models.Timetable || Timetable
  const TeacherBookingModel = models.TeacherBooking || TeacherBooking
  const session = await mongooseClient.startSession()
  let timetable

  try {
    await session.withTransaction(async () => {
      timetable = await TimetableModel.findOneAndDelete(
        { _id: timetableId, department: departmentId },
        { session }
      )
      if (!timetable) return
      await TeacherBookingModel.deleteMany(
        { department: departmentId, timetable: timetable._id },
        { session }
      )
    })
    return timetable
  } finally {
    await session.endSession()
  }
}

module.exports = {
  assertCourseCanBeDeleted,
  assertTeacherCanBeDeleted,
  deleteTimetableWithBookings,
}
