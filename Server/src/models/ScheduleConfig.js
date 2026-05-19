const mongoose = require('mongoose')

const scheduleConfigSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 8,
    },
    workingDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: [true, 'Working days are required'],
      validate: {
        validator: (arr) => arr.length >= 1,
        message: 'At least one working day is required',
      },
    },
    startTime: {
      type: String,        // "08:00"
      required: [true, 'Start time is required'],
    },
    periodDuration: {
      type: Number,        // minutes, e.g. 50
      required: [true, 'Period duration is required'],
      min: [30, 'Minimum period duration is 30 minutes'],
      max: [90, 'Maximum period duration is 90 minutes'],
    },
    periodsBeforeLunch: {
      type: Number,
      required: [true, 'Periods before lunch is required'],
      min: 1,
    },
    periodsAfterLunch: {
      type: Number,
      required: [true, 'Periods after lunch is required'],
      min: 1,
    },
    lunchDuration: {
      type: Number,        // minutes, e.g. 30
      default: 30,
    },
    lunchLabel: {
      type: String,
      default: 'Lunch Break',
    },
    // Courses included in this semester's schedule
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  },
  { timestamps: true }
)

module.exports = mongoose.model('ScheduleConfig', scheduleConfigSchema)