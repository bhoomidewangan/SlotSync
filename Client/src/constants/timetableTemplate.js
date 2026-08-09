export const TIMETABLE_DAYS = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
])

export const TIMETABLE_DISPLAY_SLOTS = Object.freeze([
  { id: 'P1',    period: 'P1',  index: 0,  label: '08:00 - 08:50', isLunch: false },
  { id: 'P2',    period: 'P2',  index: 1,  label: '08:50 - 09:40', isLunch: false },
  { id: 'P3',    period: 'P3',  index: 2,  label: '09:40 - 10:30', isLunch: false },
  { id: 'P4',    period: 'P4',  index: 3,  label: '10:30 - 11:20', isLunch: false },
  { id: 'P5',    period: 'P5',  index: 4,  label: '11:20 - 12:10', isLunch: false },
  { id: 'LUNCH', period: null,  index: 5,  label: 'Lunch Break',   isLunch: true },
  { id: 'P6',    period: 'P6',  index: 6,  label: '12:40 - 13:30', isLunch: false },
  { id: 'P7',    period: 'P7',  index: 7,  label: '13:30 - 14:20', isLunch: false },
  { id: 'P8',    period: 'P8',  index: 8,  label: '14:20 - 15:10', isLunch: false },
  { id: 'P9',    period: 'P9',  index: 9,  label: '15:10 - 16:00', isLunch: false },
  { id: 'P10',   period: 'P10', index: 10, label: '16:00 - 16:50', isLunch: false },
])
