const test = require('node:test')
const assert = require('node:assert/strict')

const Timetable = require('../src/models/Timetable')
const { generateSchema } = require('../src/middleware/schemas')

test('generation accepts a semester instead of a configuration ID', () => {
  assert.deepEqual(generateSchema.parse({ semester: '3' }), { semester: 3 })
  assert.throws(() => generateSchema.parse({ configId: 'legacy-config-id' }))
  assert.throws(() => generateSchema.parse({ semester: 9 }))
})

test('timetables no longer require or expose a configuration reference', () => {
  assert.equal(Timetable.schema.path('config'), undefined)
  assert.ok(Timetable.schema.path('department'))
  assert.ok(Timetable.schema.path('semester'))
  assert.ok(Timetable.schema.path('schedule'))
})
