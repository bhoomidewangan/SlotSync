const mongoose = require('mongoose')

const timetableSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    config: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduleConfig',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    // schedule is a 2D structure: { Monday: [ { slotIndex, label, isLunch, course, teacher } ], ... }
    // Stored as Mixed because the shape varies with config
    schedule: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Timetable', timetableSchema)