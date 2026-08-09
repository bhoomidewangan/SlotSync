const test = require('node:test')
const assert = require('node:assert/strict')

const {
  AISchedulerError,
  DEFAULT_MODEL,
  buildSchedulingRequest,
  createAISchedulerService,
} = require('../src/services/aiSchedulerService')

const rawCourses = [{
  _id: 'course-1',
  name: 'Private course name',
  department: 'department-1',
  teacher: { _id: 'teacher-1', name: 'Private teacher name', department: 'department-1' },
  sessionsPerWeek: 1,
  periodsPerSession: 1,
}]

const request = {
  semester: 3,
  courses: rawCourses,
  teacherBlockedSlots: {
    'teacher-1': ['TUE_P4'],
    'unrelated-teacher': ['MON_P1'],
  },
}

const validationContext = {
  semester: 3,
  departmentId: 'department-1',
  courses: rawCourses.map((course) => ({ ...course, semester: 3 })),
  teacherBlockedSlots: { 'teacher-1': ['TUE_P4'] },
}

const validProposal = {
  semester: 3,
  sessions: [
    { courseId: 'course-1', teacherId: 'teacher-1', day: 'Monday', periods: ['P1'], slotIds: ['MON_P1'] },
  ],
}

function geminiResponse(proposal) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(proposal) }] } }],
    }),
  }
}

function geminiErrorResponse(status, message) {
  return {
    ok: false,
    status,
    text: async () => JSON.stringify({ error: { message } }),
  }
}

test('builds a minimal request containing only involved teachers', () => {
  assert.deepEqual(buildSchedulingRequest(request), {
    semester: 3,
    courses: [{
      courseId: 'course-1',
      teacherId: 'teacher-1',
      sessionsPerWeek: 1,
      periodsPerSession: 1,
    }],
    teacherBlockedSlots: { 'teacher-1': ['TUE_P4'] },
  })
})

test('calls Gemini 3.6 Flash in JSON mode and validates the proposal locally', async () => {
  const calls = []
  const service = createAISchedulerService({
    env: { GEMINI_API_KEY: 'test-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return geminiResponse(validProposal)
    },
  })

  const proposal = await service.generateProposal({ request, validationContext })
  assert.deepEqual(proposal, validProposal)
  assert.equal(service.provider, 'gemini')
  assert.equal(service.model, DEFAULT_MODEL)
  assert.match(calls[0].url, /gemini-3\.6-flash:generateContent$/)
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'test-key')

  const body = JSON.parse(calls[0].options.body)
  assert.equal(body.generationConfig.responseMimeType, 'application/json')
  assert.equal(body.generationConfig.responseJsonSchema, undefined)
  assert.equal(body.generationConfig.temperature, undefined)
  assert.match(body.contents[0].parts[0].text, /MON_P1.*TUE_P1.*WED_P1.*THU_P1.*FRI_P1/)
  assert.doesNotMatch(body.contents[0].parts[0].text, /Private course name|Private teacher name|unrelated-teacher/)
})

test('repairs one invalid semantic proposal before returning', async () => {
  let calls = 0
  const invalidProposal = { semester: 3, sessions: [] }
  const service = createAISchedulerService({
    env: { GEMINI_API_KEY: 'test-key', AI_REPAIR_ATTEMPTS: '1' },
    fetchImpl: async () => {
      calls += 1
      return geminiResponse(calls === 1 ? invalidProposal : validProposal)
    },
  })

  assert.deepEqual(await service.generateProposal({ request, validationContext }), validProposal)
  assert.equal(calls, 2)
})

test('returns an understandable provider error without exposing response contents', async () => {
  const service = createAISchedulerService({
    env: { GEMINI_API_KEY: 'test-key', AI_TRANSIENT_RETRIES: '0' },
    fetchImpl: async () => ({ ok: false, status: 429, text: async () => 'secret provider details' }),
  })

  await assert.rejects(
    service.generateProposal({ request, validationContext }),
    (error) => error instanceof AISchedulerError &&
      error.code === 'PROVIDER_ERROR' &&
      error.status === 429 &&
      !error.message.includes('secret provider details')
  )
})

test('retries transient 429 and 503 responses with exponential backoff and jitter', async () => {
  let calls = 0
  const delays = []
  const service = createAISchedulerService({
    env: {
      GEMINI_API_KEY: 'test-key',
      AI_TRANSIENT_RETRIES: '2',
      AI_RETRY_BASE_DELAY_MS: '10',
    },
    randomImpl: () => 0.5,
    sleepImpl: async (delayMs) => delays.push(delayMs),
    fetchImpl: async () => {
      calls += 1
      if (calls === 1) return geminiErrorResponse(503, 'Temporarily unavailable')
      if (calls === 2) return geminiErrorResponse(429, 'Too many requests')
      return geminiResponse(validProposal)
    },
  })

  assert.deepEqual(await service.generateProposal({ request, validationContext }), validProposal)
  assert.equal(calls, 3)
  assert.deepEqual(delays, [15, 25])
})

test('stops after two retries when Gemini remains unavailable', async () => {
  let calls = 0
  const delays = []
  const service = createAISchedulerService({
    env: {
      GEMINI_API_KEY: 'test-key',
      AI_TRANSIENT_RETRIES: '2',
      AI_RETRY_BASE_DELAY_MS: '1',
    },
    randomImpl: () => 0,
    sleepImpl: async (delayMs) => delays.push(delayMs),
    fetchImpl: async () => {
      calls += 1
      return geminiErrorResponse(503, 'High demand')
    },
  })

  await assert.rejects(
    service.generateProposal({ request, validationContext }),
    (error) => error instanceof AISchedulerError && error.status === 503
  )
  assert.equal(calls, 3)
  assert.deepEqual(delays, [1, 2])
})

test('surfaces a bounded Gemini error message while redacting the API key', async () => {
  const service = createAISchedulerService({
    env: { GEMINI_API_KEY: 'sensitive-test-key' },
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        error: {
          message: 'Invalid generationConfig for sensitive-test-key.\nRemove unsupported parameters.',
        },
      }),
    }),
  })

  await assert.rejects(
    service.generateProposal({ request, validationContext }),
    (error) => error instanceof AISchedulerError &&
      error.message.includes('Invalid generationConfig') &&
      error.message.includes('[redacted]') &&
      !error.message.includes('sensitive-test-key') &&
      !error.message.includes('\n')
  )
})

test('aborts Gemini requests that exceed the configured timeout', async () => {
  const service = createAISchedulerService({
    env: { GEMINI_API_KEY: 'test-key', AI_REQUEST_TIMEOUT_MS: '5' },
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted')
        error.name = 'AbortError'
        reject(error)
      })
    }),
  })

  await assert.rejects(
    service.generateProposal({ request, validationContext }),
    (error) => error instanceof AISchedulerError && error.code === 'PROVIDER_TIMEOUT'
  )
})

test('rejects Gemini responses above the configured size limit', async () => {
  const service = createAISchedulerService({
    env: { GEMINI_API_KEY: 'test-key', AI_MAX_RESPONSE_BYTES: '1024' },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => '2048' },
      text: async () => assert.fail('oversized response body should not be read'),
    }),
  })

  await assert.rejects(
    service.generateProposal({ request, validationContext }),
    (error) => error instanceof AISchedulerError && error.code === 'RESPONSE_TOO_LARGE'
  )
})
