/**
 * slotBuilder.js
 * Takes a ScheduleConfig and returns:
 *   - slots: array of { index, label, isLunch } for the day
 *   - days:  the working days array
 *
 * Example output for startTime=08:00, duration=50, before=4, after=3:
 * [
 *   { index: 0, label: '08:00 - 08:50', isLunch: false },
 *   { index: 1, label: '08:50 - 09:40', isLunch: false },
 *   { index: 2, label: '09:40 - 10:30', isLunch: false },
 *   { index: 3, label: '10:30 - 11:20', isLunch: false },
 *   { index: 4, label: '11:20 - 11:50', isLunch: true  },  ← lunch
 *   { index: 5, label: '11:50 - 12:40', isLunch: false },
 *   { index: 6, label: '12:40 - 13:30', isLunch: false },
 *   { index: 7, label: '13:30 - 14:20', isLunch: false },
 * ]
 */

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + minutes
  const newH = Math.floor(total / 60)
  const newM = total % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

function buildSlots(config) {
  const {
    startTime,
    periodDuration,
    periodsBeforeLunch,
    periodsAfterLunch,
    lunchDuration = 30,
    lunchLabel = 'Lunch Break',
    workingDays,
  } = config

  const slots = []
  let currentTime = startTime
  let index = 0

  // Periods before lunch
  for (let i = 0; i < periodsBeforeLunch; i++) {
    const end = addMinutes(currentTime, periodDuration)
    slots.push({
      index,
      label: `${currentTime} - ${end}`,
      isLunch: false,
    })
    currentTime = end
    index++
  }

  // Lunch slot
  const lunchEnd = addMinutes(currentTime, lunchDuration)
  slots.push({
    index,
    label: lunchLabel,
    isLunch: true,
    lunchStart: currentTime,
    lunchEnd,
  })
  currentTime = lunchEnd
  index++

  // Periods after lunch
  for (let i = 0; i < periodsAfterLunch; i++) {
    const end = addMinutes(currentTime, periodDuration)
    slots.push({
      index,
      label: `${currentTime} - ${end}`,
      isLunch: false,
    })
    currentTime = end
    index++
  }

  return { slots, days: workingDays }
}

// Returns only the non-lunch slot indices (these are the placeable slots)
function getPlaceableSlotIndices(slots) {
  return slots.filter(s => !s.isLunch).map(s => s.index)
}

// Returns the lunch slot index
function getLunchSlotIndex(slots) {
  return slots.find(s => s.isLunch)?.index
}

module.exports = { buildSlots, getPlaceableSlotIndices, getLunchSlotIndex }