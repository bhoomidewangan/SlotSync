const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { createGenerationGuard } = require('../src/middleware/generationGuard')

function response() {
  const res = new EventEmitter()
  res.status = (statusCode) => {
    res.statusCode = statusCode
    return res
  }
  res.json = (body) => {
    res.body = body
    return res
  }
  return res
}

test('prevents simultaneous generation for the same department', () => {
  const guard = createGenerationGuard({ maxRequests: 5, windowMs: 60_000, now: () => 100 })
  const req = { department: { _id: 'department-1' } }
  const firstResponse = response()
  let firstContinued = false
  guard(req, firstResponse, () => { firstContinued = true })

  const secondResponse = response()
  guard(req, secondResponse, () => assert.fail('concurrent request should not continue'))

  assert.equal(firstContinued, true)
  assert.equal(secondResponse.statusCode, 409)
  firstResponse.emit('finish')

  let thirdContinued = false
  guard(req, response(), () => { thirdContinued = true })
  assert.equal(thirdContinued, true)
})

test('rate limits repeated generation requests per department', () => {
  let currentTime = 100
  const guard = createGenerationGuard({ maxRequests: 1, windowMs: 1_000, now: () => currentTime })
  const req = { department: { _id: 'department-1' } }
  const firstResponse = response()
  guard(req, firstResponse, () => {})
  firstResponse.emit('finish')

  const limitedResponse = response()
  guard(req, limitedResponse, () => assert.fail('rate-limited request should not continue'))
  assert.equal(limitedResponse.statusCode, 429)

  currentTime = 1_101
  let continued = false
  guard(req, response(), () => { continued = true })
  assert.equal(continued, true)
})
