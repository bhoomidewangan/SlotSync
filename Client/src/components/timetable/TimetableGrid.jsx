import { forwardRef } from 'react'
import { TIMETABLE_DAYS, TIMETABLE_DISPLAY_SLOTS } from '@/constants/timetableTemplate'

const COLORS = [
  { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   dot: 'bg-blue-400' },
  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  dot: 'bg-green-400' },
  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-400' },
  { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-800',   dot: 'bg-rose-400' },
  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  dot: 'bg-amber-400' },
  { bg: 'bg-cyan-50',   border: 'border-cyan-200',   text: 'text-cyan-800',   dot: 'bg-cyan-400' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', dot: 'bg-indigo-400' },
  { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-800',   dot: 'bg-teal-400' },
]

function buildCourseColorMap(days, slots, schedule) {
  const map = {}
  let colorIndex = 0
  for (const day of days) {
    for (const slot of slots) {
      if (slot.isLunch) continue
      const cell = schedule[day]?.[slot.index]
      if (cell?.course && !map[cell.course._id]) {
        map[cell.course._id] = COLORS[colorIndex % COLORS.length]
        colorIndex++
      }
    }
  }
  return map
}

const TimetableGrid = forwardRef(function TimetableGrid({ timetable }, ref) {
  const { schedule } = timetable.schedule
  const days = TIMETABLE_DAYS
  const slots = TIMETABLE_DISPLAY_SLOTS

  const colorMap = buildCourseColorMap(days, slots, schedule)

  return (
    <div ref={ref} className="bg-white p-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              {/* Time column header */}
              <th className="border border-border px-3 py-3 text-left text-xs font-semibold text-muted-foreground w-32">
                Time
              </th>
              {days.map(day => (
                <th
                  key={day}
                  className="border border-border px-3 py-3 text-center text-xs font-semibold text-foreground"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              // Lunch row
              if (slot.isLunch) {
                return (
                  <tr key={`lunch-${slot.index}`} className="bg-amber-50">
                    <td className="border border-border px-3 py-2 text-xs text-amber-700 font-medium">
                      {slot.label}
                    </td>
                    <td
                      colSpan={days.length}
                      className="border border-border px-3 py-2 text-center text-xs font-semibold text-amber-700 tracking-wide"
                    >
                      🍽 {slot.label}
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={slot.index} className="hover:bg-muted/20 transition-colors">
                  {/* Time label */}
                  <td className="border border-border px-3 py-2 text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {slot.label}
                  </td>

                  {days.map(day => {
                    const cell = schedule[day]?.[slot.index]

                    // Empty cell
                    if (!cell?.course) {
                      return (
                        <td
                          key={day}
                          className="border border-border px-2 py-2 text-center text-muted-foreground/30 text-xs"
                        >
                          —
                        </td>
                      )
                    }

                    const color = colorMap[cell.course._id] || COLORS[0]

                    // Continuation cell (not the start of a session) — show a thin bar
                    if (cell.isStart === false) {
                      return (
                        <td
                          key={day}
                          className={`border border-border px-2 py-1 ${color.bg}`}
                        >
                          <div className={`h-full w-1 rounded mx-auto ${color.dot} opacity-40`} />
                        </td>
                      )
                    }

                    // Start cell
                    return (
                      <td
                        key={day}
                        className={`border border-border px-2 py-2 ${color.bg}`}
                      >
                        <div className={`rounded-md border ${color.border} ${color.bg} px-2 py-1.5`}>
                          <p className={`text-xs font-semibold ${color.text} leading-tight`}>
                            {cell.course.name}
                          </p>
                          <p className={`text-xs ${color.text} opacity-70 mt-0.5`}>
                            {cell.teacher?.name}
                          </p>
                          {cell.sessionSize > 1 && (
                            <p className={`text-xs ${color.text} opacity-50 mt-0.5`}>
                              {cell.sessionSize} periods
                            </p>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})

export default TimetableGrid
