const mongoose = require('mongoose')
const TeacherBooking = require('../models/TeacherBooking')
const Timetable = require('../models/Timetable')
const { validateScheduleProposal } = require('../validators/scheduleValidator')
const { loadSchedulingContext } = require('./schedulingContextService')
const { formatProposalSchedule, proposalToBookings } = require('./scheduleFormatter')

async function acceptTimetableProposal({
  departmentId,
  semester,
  proposal,
  generatedAt,
  contextLoader = loadSchedulingContext,
  models = {},
  mongooseClient = mongoose,
  now = () => new Date(),
}) {
  const TimetableModel = models.Timetable || Timetable
  const TeacherBookingModel = models.TeacherBooking || TeacherBooking
  const context = await contextLoader({ departmentId, semester })

  if (context.courses.length === 0) {
    const error = new Error(`No courses found for Semester ${semester}.`)
    error.statusCode = 404
    throw error
  }

  const validatedProposal = validateScheduleProposal(proposal, {
    semester,
    departmentId,
    courses: context.courses,
    teacherBlockedSlots: context.teacherBlockedSlots,
  })
  const schedule = formatProposalSchedule(validatedProposal, context.courses)
  const session = await mongooseClient.startSession()
  let timetable

  try {
    await session.withTransaction(async () => {
      if (context.existingTimetable) {
        await TeacherBookingModel.deleteMany(
          { department: departmentId, timetable: context.existingTimetable._id },
          { session }
        )
      }

      timetable = await TimetableModel.findOneAndUpdate(
        { department: departmentId, semester: Number(semester) },
        {
          $set: {
            department: departmentId,
            semester: Number(semester),
            generatedAt: new Date(generatedAt),
            acceptedAt: now(),
            schedule,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          session,
        }
      )

      const bookings = proposalToBookings({
        proposal: validatedProposal,
        courses: context.courses,
        departmentId,
        timetableId: timetable._id,
        semester,
      })
      if (bookings.length > 0) await TeacherBookingModel.insertMany(bookings, { session })
    })
    return timetable
  } finally {
    await session.endSession()
  }
}

module.exports = { acceptTimetableProposal }
