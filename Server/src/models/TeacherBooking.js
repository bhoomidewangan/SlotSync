const mongoose = require('mongoose')

const teacherBookingSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    timetable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    period: {
      type: String,
      required: true,
      enum: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'],
    },
    slotId: {
      type: String,
      required: true,
      match: /^(MON|TUE|WED|THU|FRI)_P(?:[1-9]|10)$/,
    },
  },
  { timestamps: true }
)

teacherBookingSchema.index(
  {
    department: 1,
    teacher: 1,
    day: 1,
    period: 1,
  },
  { unique: true }
)

module.exports = mongoose.model('TeacherBooking', teacherBookingSchema)
