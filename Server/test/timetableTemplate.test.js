const test = require('node:test')
const assert = require('node:assert/strict')

const {
  TIMETABLE_TEMPLATE,
  createSlotId,
} = require('../src/constants/timetableTemplate')

test('defines the fixed Monday-Friday timetable shape', () => {
  assert.deepEqual(
    TIMETABLE_TEMPLATE.days.map((day) => day.name),
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  )
  assert.deepEqual(
    TIMETABLE_TEMPLATE.periods.map((period) => period.id),
    ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']
  )
  assert.equal(TIMETABLE_TEMPLATE.displaySlots[5].id, 'LUNCH')
  assert.equal(TIMETABLE_TEMPLATE.lunch.startTime, '12:10')
  assert.equal(TIMETABLE_TEMPLATE.lunch.endTime, '12:40')
})

test('defines 50 unique stable day-period slot IDs', () => {
  const slotIds = TIMETABLE_TEMPLATE.schedulableSlots.map((slot) => slot.slotId)

  assert.equal(slotIds.length, 50)
  assert.equal(new Set(slotIds).size, 50)
  assert.ok(slotIds.includes('MON_P1'))
  assert.ok(slotIds.includes('TUE_P7'))
  assert.ok(slotIds.includes('FRI_P10'))
  assert.equal(createSlotId('Thursday', 'P4'), 'THU_P4')
})

test('keeps the fixed template independent of legacy configuration', () => {
  assert.equal(TIMETABLE_TEMPLATE.displaySlots.length, 11)
  assert.equal(TIMETABLE_TEMPLATE.displaySlots[0].label, '08:00 - 08:50')
  assert.equal(TIMETABLE_TEMPLATE.displaySlots[5].id, 'LUNCH')
  assert.equal(TIMETABLE_TEMPLATE.displaySlots[10].id, 'P10')
})
