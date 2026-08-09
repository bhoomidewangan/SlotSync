const deepFreeze = (value) => {
  Object.freeze(value)
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) {
      deepFreeze(child)
    }
  })
  return value
}

const days = [
  { code: 'MON', name: 'Monday' },
  { code: 'TUE', name: 'Tuesday' },
  { code: 'WED', name: 'Wednesday' },
  { code: 'THU', name: 'Thursday' },
  { code: 'FRI', name: 'Friday' },
]

const periods = [
  { id: 'P1',  startTime: '08:00', endTime: '08:50' },
  { id: 'P2',  startTime: '08:50', endTime: '09:40' },
  { id: 'P3',  startTime: '09:40', endTime: '10:30' },
  { id: 'P4',  startTime: '10:30', endTime: '11:20' },
  { id: 'P5',  startTime: '11:20', endTime: '12:10' },
  { id: 'P6',  startTime: '12:40', endTime: '13:30' },
  { id: 'P7',  startTime: '13:30', endTime: '14:20' },
  { id: 'P8',  startTime: '14:20', endTime: '15:10' },
  { id: 'P9',  startTime: '15:10', endTime: '16:00' },
  { id: 'P10', startTime: '16:00', endTime: '16:50' },
].map((period) => ({
  ...period,
  label: `${period.startTime} - ${period.endTime}`,
}))

const lunch = {
  id: 'LUNCH',
  label: 'Lunch Break',
  startTime: '12:10',
  endTime: '12:40',
  isLunch: true,
}

const displaySlots = [
  ...periods.slice(0, 5),
  lunch,
  ...periods.slice(5),
].map((slot, index) => ({
  ...slot,
  index,
  period: slot.isLunch ? null : slot.id,
  isLunch: slot.isLunch || false,
}))

const schedulableSlots = days.flatMap((day) =>
  periods.map((period) => ({
    slotId: `${day.code}_${period.id}`,
    day: day.name,
    dayCode: day.code,
    period: period.id,
    startTime: period.startTime,
    endTime: period.endTime,
  }))
)

const TIMETABLE_TEMPLATE = deepFreeze({
  days,
  periods,
  lunch,
  displaySlots,
  schedulableSlots,
})

function createSlotId(dayName, periodId) {
  const day = TIMETABLE_TEMPLATE.days.find((item) => item.name === dayName)
  if (!day) throw new Error(`Unknown timetable day: ${dayName}`)
  if (!TIMETABLE_TEMPLATE.periods.some((item) => item.id === periodId)) {
    throw new Error(`Unknown timetable period: ${periodId}`)
  }
  return `${day.code}_${periodId}`
}

module.exports = { TIMETABLE_TEMPLATE, createSlotId }
