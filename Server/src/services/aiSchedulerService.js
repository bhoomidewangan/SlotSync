const { z } = require('zod')
const {
  SLOT_IDS,
  scheduleProposalSchema,
} = require('../schemas/scheduleProposal')
const {
  ScheduleValidationError,
  validateScheduleProposal,
} = require('../validators/scheduleValidator')

const DEFAULT_MODEL = 'gemini-3.6-flash'
const DEFAULT_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_TIMEOUT_MS = 90_000
const DEFAULT_REPAIR_ATTEMPTS = 1
const DEFAULT_MAX_RESPONSE_BYTES = 1_000_000
const DEFAULT_TRANSIENT_RETRIES = 2
const DEFAULT_RETRY_BASE_DELAY_MS = 1_000

const courseRequestSchema = z.object({
  courseId: z.string().min(1).max(100),
  teacherId: z.string().min(1).max(100),
  sessionsPerWeek: z.number().int().min(1).max(5),
  periodsPerSession: z.number().int().min(1).max(3),
}).strict()

const schedulingRequestSchema = z.object({
  semester: z.number().int().min(1).max(8),
  courses: z.array(courseRequestSchema).min(1),
  teacherBlockedSlots: z.record(z.array(z.enum(SLOT_IDS))),
}).strict().superRefine((request, context) => {
  const seenCourseIds = new Set()
  request.courses.forEach((course, index) => {
    if (seenCourseIds.has(course.courseId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate course ID ${course.courseId}.`,
        path: ['courses', index, 'courseId'],
      })
    }
    seenCourseIds.add(course.courseId)
  })
})

class AISchedulerError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'AISchedulerError'
    this.code = code
    this.status = options.status
    this.statusCode = options.statusCode || {
      MISSING_API_KEY: 503,
      PROVIDER_UNAVAILABLE: 503,
      PROVIDER_TIMEOUT: 504,
      PROVIDER_ERROR: 502,
      INVALID_PROVIDER_RESPONSE: 502,
      EMPTY_PROVIDER_RESPONSE: 502,
      RESPONSE_TOO_LARGE: 502,
      INVALID_PROPOSAL: 422,
    }[code] || 500
    this.validationIssues = options.validationIssues
  }
}

function idOf(value) {
  if (value && typeof value === 'object' && value._id !== undefined) return String(value._id)
  return value === undefined || value === null ? null : String(value)
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function isTransientProviderError(error) {
  return error instanceof AISchedulerError &&
    error.code === 'PROVIDER_ERROR' &&
    [429, 503].includes(error.status)
}

function buildSchedulingRequest({ semester, courses, teacherBlockedSlots = {} }) {
  const sanitizedCourses = (courses || []).map((course) => ({
    courseId: idOf(course.courseId ?? course),
    teacherId: idOf(course.teacherId ?? course.teacher),
    sessionsPerWeek: Number(course.sessionsPerWeek),
    periodsPerSession: Number(course.periodsPerSession),
  }))
  const involvedTeacherIds = new Set(sanitizedCourses.map((course) => course.teacherId))
  const relevantBlockedSlots = {}

  for (const teacherId of involvedTeacherIds) {
    relevantBlockedSlots[teacherId] = teacherBlockedSlots[teacherId] || []
  }

  return schedulingRequestSchema.parse({
    semester: Number(semester),
    courses: sanitizedCourses,
    teacherBlockedSlots: relevantBlockedSlots,
  })
}

function buildPrompt(request, repair = null) {
  const base = [
    'Create one valid weekly timetable proposal for the supplied semester.',
    'Use only the supplied course IDs, teacher IDs, and fixed slot IDs.',
    'Create exactly sessionsPerWeek entries for each course.',
    'Each entry must contain exactly periodsPerSession consecutive periods.',
    'Use only Monday through Friday and periods P1 through P10.',
    'Build slot IDs as MON_P1, TUE_P1, WED_P1, THU_P1, or FRI_P1 using the matching day and period.',
    'Do not cross lunch between P5 and P6.',
    'Do not place two courses in the same slot, use blocked teacher slots, or place the same course twice in one day.',
    'Return only JSON in this shape: {"semester":1,"sessions":[{"courseId":"...","teacherId":"...","day":"Monday","periods":["P1"],"slotIds":["MON_P1"]}]}.',
    `Scheduling input: ${JSON.stringify(request)}`,
  ]

  if (repair) {
    base.push(
      `The previous proposal was invalid: ${JSON.stringify(repair.issues)}`,
      `Previous proposal: ${JSON.stringify(repair.proposal)}`,
      'Return a corrected complete proposal.'
    )
  }

  return base.join('\n')
}

function extractCandidateText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return null
  const text = parts.map((part) => part?.text || '').join('')
  return text || null
}

function extractProviderErrorMessage(rawResponse, apiKey) {
  try {
    const message = JSON.parse(rawResponse)?.error?.message
    if (typeof message !== 'string' || message.trim().length === 0) return null

    return message
      .replaceAll(apiKey || '', '[redacted]')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 300)
  } catch {
    return null
  }
}

function createAISchedulerService(options = {}) {
  const env = options.env || process.env
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const apiKey = env.GEMINI_API_KEY
  const sleepImpl = options.sleepImpl || ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)))
  const randomImpl = options.randomImpl || Math.random
  const model = env.GEMINI_MODEL || DEFAULT_MODEL
  const apiBaseUrl = (env.GEMINI_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
  const timeoutMs = boundedInteger(env.AI_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 1, 120_000)
  const repairAttempts = boundedInteger(
    env.AI_REPAIR_ATTEMPTS,
    DEFAULT_REPAIR_ATTEMPTS,
    0,
    2
  )
  const maxResponseBytes = boundedInteger(
    env.AI_MAX_RESPONSE_BYTES,
    DEFAULT_MAX_RESPONSE_BYTES,
    1_024,
    5_000_000
  )
  const transientRetries = boundedInteger(
    env.AI_TRANSIENT_RETRIES,
    DEFAULT_TRANSIENT_RETRIES,
    0,
    2
  )
  const retryBaseDelayMs = boundedInteger(
    env.AI_RETRY_BASE_DELAY_MS,
    DEFAULT_RETRY_BASE_DELAY_MS,
    1,
    10_000
  )

  if (typeof fetchImpl !== 'function') {
    throw new AISchedulerError('PROVIDER_UNAVAILABLE', 'No HTTP client is available for Gemini.')
  }

  async function callGemini(request, repair) {
    if (!apiKey) {
      throw new AISchedulerError('MISSING_API_KEY', 'GEMINI_API_KEY is not configured.')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    let response

    try {
      response = await fetchImpl(
        `${apiBaseUrl}/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: buildPrompt(request, repair) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 8_192,
            },
          }),
        }
      )
    } catch (error) {
      clearTimeout(timeout)
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        throw new AISchedulerError('PROVIDER_TIMEOUT', 'Gemini did not respond before the request timeout.', {
          cause: error,
        })
      }
      throw new AISchedulerError('PROVIDER_UNAVAILABLE', 'Could not reach the Gemini API.', { cause: error })
    }

    if (!response.ok) {
      let providerMessage = null
      try {
        const errorResponse = await response.text()
        if (Buffer.byteLength(errorResponse, 'utf8') <= maxResponseBytes) {
          providerMessage = extractProviderErrorMessage(errorResponse, apiKey)
        }
      } catch {
        // Keep the public error generic when the provider error body cannot be read.
      } finally {
        clearTimeout(timeout)
      }
      throw new AISchedulerError(
        'PROVIDER_ERROR',
        providerMessage
          ? `Gemini rejected the scheduling request (${response.status}): ${providerMessage}`
          : `Gemini returned an unsuccessful response (${response.status}).`,
        { status: response.status }
      )
    }

    const contentLength = Number(response.headers?.get?.('content-length'))
    if (Number.isFinite(contentLength) && contentLength > maxResponseBytes) {
      clearTimeout(timeout)
      throw new AISchedulerError('RESPONSE_TOO_LARGE', 'Gemini returned more data than the scheduler can safely process.')
    }

    let rawResponse
    try {
      rawResponse = await response.text()
    } catch (error) {
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        throw new AISchedulerError('PROVIDER_TIMEOUT', 'Gemini did not respond before the request timeout.', {
          cause: error,
        })
      }
      throw new AISchedulerError('PROVIDER_UNAVAILABLE', 'Could not read the Gemini API response.', {
        cause: error,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (Buffer.byteLength(rawResponse, 'utf8') > maxResponseBytes) {
      throw new AISchedulerError('RESPONSE_TOO_LARGE', 'Gemini returned more data than the scheduler can safely process.')
    }

    let payload
    try {
      payload = JSON.parse(rawResponse)
    } catch (error) {
      throw new AISchedulerError('INVALID_PROVIDER_RESPONSE', 'Gemini returned malformed response data.', {
        cause: error,
      })
    }

    const candidateText = extractCandidateText(payload)
    if (!candidateText) {
      throw new AISchedulerError(
        'EMPTY_PROVIDER_RESPONSE',
        'Gemini returned no timetable proposal.'
      )
    }

    try {
      return JSON.parse(candidateText)
    } catch (error) {
      throw new ScheduleValidationError([{
        code: 'INVALID_JSON',
        message: 'Gemini proposal is not valid JSON.',
        path: [],
      }])
    }
  }

  async function callGeminiWithRetry(request, repair) {
    for (let attempt = 0; attempt <= transientRetries; attempt += 1) {
      try {
        return await callGemini(request, repair)
      } catch (error) {
        if (!isTransientProviderError(error) || attempt === transientRetries) throw error

        const exponentialDelay = retryBaseDelayMs * (2 ** attempt)
        const jitter = Math.floor(randomImpl() * retryBaseDelayMs)
        await sleepImpl(exponentialDelay + jitter)
      }
    }

    throw new AISchedulerError('PROVIDER_UNAVAILABLE', 'Gemini is temporarily unavailable.')
  }

  async function generateProposal({ request, validationContext }) {
    const sanitizedRequest = buildSchedulingRequest(request)
    let repair = null

    for (let attempt = 0; attempt <= repairAttempts; attempt += 1) {
      let rawProposal
      try {
        rawProposal = await callGeminiWithRetry(sanitizedRequest, repair)
        const formattedProposal = scheduleProposalSchema.parse(rawProposal)
        return validateScheduleProposal(formattedProposal, validationContext)
      } catch (error) {
        const zodIssues = error instanceof z.ZodError
          ? error.errors.map((item) => ({ code: 'INVALID_FORMAT', message: item.message, path: item.path }))
          : null
        const validationIssues = error instanceof ScheduleValidationError
          ? error.issues
          : zodIssues

        if (!validationIssues) throw error
        if (attempt === repairAttempts) {
          throw new AISchedulerError(
            'INVALID_PROPOSAL',
            'Gemini could not produce a valid timetable proposal.',
            { cause: error, validationIssues }
          )
        }
        repair = { proposal: rawProposal || null, issues: validationIssues }
      }
    }

    throw new AISchedulerError('INVALID_PROPOSAL', 'Gemini could not produce a valid timetable proposal.')
  }

  return {
    provider: 'gemini',
    model,
    buildSchedulingRequest,
    generateProposal,
  }
}

module.exports = {
  AISchedulerError,
  DEFAULT_MODEL,
  buildSchedulingRequest,
  createAISchedulerService,
}
