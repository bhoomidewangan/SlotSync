const mongoose = require('mongoose')

const courseSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be between 1 and 8'],
      max: [8, 'Semester must be between 1 and 8'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher is required'],
    },
    sessionsPerWeek: {
      type: Number,
      required: [true, 'Sessions per week is required'],
      min: [1, 'Must be at least 1 session per week'],
      max: [6, 'Cannot exceed 6 sessions per week'],
    },
    periodsPerSession: {
      type: Number,
      required: [true, 'Periods per session is required'],
      min: [1, 'Must be at least 1 period'],
      max: [3, 'Cannot exceed 3 consecutive periods'],
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Course', courseSchema)