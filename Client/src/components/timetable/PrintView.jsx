import { forwardRef } from 'react'
import { TIMETABLE_DAYS, TIMETABLE_DISPLAY_SLOTS } from '@/constants/timetableTemplate'

const COLORS = [
  { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
  { bg: '#FAF5FF', border: '#E9D5FF', text: '#6B21A8' },
  { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239' },
  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  { bg: '#ECFEFF', border: '#A5F3FC', text: '#155E75' },
  { bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3' },
  { bg: '#F0FDFA', border: '#99F6E4', text: '#134E4A' },
]

function buildColorMap(days, slots, schedule) {
  const map = {}
  let idx = 0
  for (const day of days) {
    for (const slot of slots) {
      if (slot.isLunch) continue
      const cell = schedule[day]?.[slot.index]
      if (cell?.course && !map[cell.course._id]) {
        map[cell.course._id] = COLORS[idx % COLORS.length]
        idx++
      }
    }
  }
  return map
}

const PrintView = forwardRef(function PrintView({ timetable, semester }, ref) {
  const { schedule } = timetable.schedule
  const days = TIMETABLE_DAYS
  const slots = TIMETABLE_DISPLAY_SLOTS
  const colorMap = buildColorMap(days, slots, schedule)

  const cellStyle = {
    border: '1px solid #E2E8F0',
    padding: '6px 8px',
    fontSize: '11px',
    verticalAlign: 'top',
  }

  // Build legend entries
  const legendEntries = []
  for (const day of days) {
    for (const slot of slots) {
      if (slot.isLunch) continue
      const cell = schedule[day]?.[slot.index]
      if (cell?.course && !legendEntries.find(e => e.id === String(cell.course._id))) {
        legendEntries.push({ id: String(cell.course._id), name: cell.course.name })
      }
    }
  }

  return (
    <div ref={ref} style={{ background: '#fff', padding: '24px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Semester {semester} — Timetable
        </h2>
        <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', marginBottom: 0 }}>
          Generated on {new Date().toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            <th style={{ ...cellStyle, fontWeight: 600, color: '#64748B', width: '110px', textAlign: 'left' }}>
              Time
            </th>
            {days.map(day => (
              <th key={day} style={{ ...cellStyle, fontWeight: 600, color: '#0F172A', textAlign: 'center' }}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map(slot => {
            if (slot.isLunch) {
              return (
                <tr key={`lunch-${slot.index}`} style={{ background: '#FFFBEB' }}>
                  <td style={{ ...cellStyle, color: '#B45309', fontWeight: 500 }}>{slot.label}</td>
                  <td
                    colSpan={days.length}
                    style={{ ...cellStyle, textAlign: 'center', color: '#B45309', fontWeight: 600 }}
                  >
                    {slot.label}
                  </td>
                </tr>
              )
            }

            return (
              <tr key={slot.index}>
                <td style={{ ...cellStyle, color: '#94A3B8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {slot.label}
                </td>
                {days.map(day => {
                  const cell = schedule[day]?.[slot.index]

                  if (!cell?.course) {
                    return (
                      <td key={day} style={{ ...cellStyle, color: '#CBD5E1', textAlign: 'center' }}>—</td>
                    )
                  }

                  if (cell.isStart === false) {
                    const color = colorMap[cell.course._id] || COLORS[0]
                    return <td key={day} style={{ ...cellStyle, background: color.bg }} />
                  }

                  const color = colorMap[String(cell.course._id)] || COLORS[0]
                  return (
                    <td key={day} style={{ ...cellStyle, background: color.bg }}>
                      <div style={{
                        border: `1px solid ${color.border}`,
                        borderRadius: '4px',
                        padding: '4px 6px',
                        background: color.bg,
                      }}>
                        <div style={{ fontWeight: 600, color: color.text, fontSize: '11px' }}>
                          {cell.course.name}
                        </div>
                        <div style={{ color: color.text, opacity: 0.7, fontSize: '10px', marginTop: '2px' }}>
                          {cell.teacher?.name}
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Legend */}
      {legendEntries.length > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {legendEntries.map(entry => {
            const color = colorMap[entry.id] || COLORS[0]
            return (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '2px',
                  background: color.bg, border: `1px solid ${color.border}`,
                }} />
                <span style={{ fontSize: '10px', color: '#64748B' }}>{entry.name}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

export default PrintView
