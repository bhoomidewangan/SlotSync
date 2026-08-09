const mongoose = require('mongoose')

const timetableSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Structured fixed-template schedule with course and teacher assignments.
    schedule: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
)

timetableSchema.index(
  {
    department: 1,
    semester: 1,
  },
  { unique: true }
)

module.exports = mongoose.model('Timetable', timetableSchema)
