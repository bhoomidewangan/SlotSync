const Course = require('../models/Course')
const TeacherBooking = require('../models/TeacherBooking')
const Timetable = require('../models/Timetable')

function idOf(value) {
  if (value && typeof value === 'object' && value._id !== undefined) return String(value._id)
  return String(value)
}

async function loadSchedulingContext({ departmentId, semester, models = {} }) {
  const CourseModel = models.Course || Course
  const TimetableModel = models.Timetable || Timetable
  const TeacherBookingModel = models.TeacherBooking || TeacherBooking

  const courses = await CourseModel.find({
    department: departmentId,
    semester: Number(semester),
  }).populate('teacher', 'name _id department')

  const teacherIds = [...new Set(courses.map((course) => idOf(course.teacher)))]
  const existingTimetable = await TimetableModel.findOne({
    department: departmentId,
    semester: Number(semester),
  })

  const teacherBlockedSlots = Object.fromEntries(teacherIds.map((teacherId) => [teacherId, []]))
  if (teacherIds.length === 0) {
    return { courses, existingTimetable, teacherBlockedSlots }
  }

  const bookingFilter = {
    department: departmentId,
    teacher: { $in: teacherIds },
  }
  if (existingTimetable) bookingFilter.timetable = { $ne: existingTimetable._id }

  const bookings = await TeacherBookingModel.find(bookingFilter).select('teacher slotId')
  for (const booking of bookings) {
    const teacherId = idOf(booking.teacher)
    const blocked = teacherBlockedSlots[teacherId]
    if (blocked && !blocked.includes(booking.slotId)) blocked.push(booking.slotId)
  }

  return { courses, existingTimetable, teacherBlockedSlots }
}

module.exports = { loadSchedulingContext }
