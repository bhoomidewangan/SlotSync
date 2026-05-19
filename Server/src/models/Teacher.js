const mongoose = require('mongoose')

const teacherSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Teacher name is required'],
      trim: true,
    },
    subjects: {
      type: [String],
      required: [true, 'At least one subject is required'],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'Teacher must have at least one subject',
      },
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Teacher', teacherSchema)