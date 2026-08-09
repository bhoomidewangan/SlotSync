const { z } = require('zod')
const { TIMETABLE_TEMPLATE } = require('../constants/timetableTemplate')

const DAY_NAMES = TIMETABLE_TEMPLATE.days.map((day) => day.name)
const PERIOD_IDS = TIMETABLE_TEMPLATE.periods.map((period) => period.id)
const SLOT_IDS = TIMETABLE_TEMPLATE.schedulableSlots.map((slot) => slot.slotId)

const sessionSchema = z.object({
  courseId: z.string().min(1).max(100),
  teacherId: z.string().min(1).max(100),
  day: z.enum(DAY_NAMES),
  periods: z.array(z.enum(PERIOD_IDS)).min(1).max(3),
  slotIds: z.array(z.enum(SLOT_IDS)).min(1).max(3),
}).strict()

const scheduleProposalSchema = z.object({
  semester: z.number().int().min(1).max(8),
  sessions: z.array(sessionSchema).max(50),
}).strict()

module.exports = {
  DAY_NAMES,
  PERIOD_IDS,
  SLOT_IDS,
  scheduleProposalSchema,
}
