const { z } = require('zod')

const requiredText = (name) => z.string({
  required_error: `${name} is required.`,
}).trim().min(1, `${name} cannot be empty.`)

const positiveInteger = (name) => z.coerce.number({
  required_error: `${name} is required.`,
}).int(`${name} must be an integer.`).positive(`${name} must be greater than zero.`)

const nonNegativeInteger = (name) => z.coerce.number({
  required_error: `${name} is required.`,
}).int(`${name} must be an integer.`).nonnegative(`${name} cannot be negative.`)

const duration = (name) => requiredText(name).regex(
  /^\d+(?:ms|s|m|h|d)$/,
  `${name} must be a duration such as 90s, 2h, or 7d.`
)

const isPlaceholder = (value) => /REPLACE_|YOUR-|USERNAME|PASSWORD|CLUSTER|DATABASE/.test(value)

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().max(65535).default(5000),
  MONGODB_URI: requiredText('MONGODB_URI').refine(
    (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
    'MONGODB_URI must start with mongodb:// or mongodb+srv://.'
  ).refine((value) => !isPlaceholder(value), 'MONGODB_URI still contains placeholder values.'),
  FRONTEND_URL: requiredText('FRONTEND_URL')
    .url('FRONTEND_URL must be a valid absolute URL.')
    .refine((value) => !isPlaceholder(value), 'FRONTEND_URL still contains a placeholder value.'),
  JWT_SECRET: requiredText('JWT_SECRET')
    .min(32, 'JWT_SECRET must contain at least 32 characters.')
    .refine((value) => !isPlaceholder(value), 'JWT_SECRET still contains a placeholder value.'),
  JWT_EXPIRES_IN: duration('JWT_EXPIRES_IN'),
  GEMINI_API_KEY: requiredText('GEMINI_API_KEY')
    .min(20, 'GEMINI_API_KEY appears too short.')
    .refine((value) => !isPlaceholder(value), 'GEMINI_API_KEY still contains a placeholder value.'),
  GEMINI_MODEL: requiredText('GEMINI_MODEL'),
  AI_REQUEST_TIMEOUT_MS: positiveInteger('AI_REQUEST_TIMEOUT_MS'),
  AI_REPAIR_ATTEMPTS: nonNegativeInteger('AI_REPAIR_ATTEMPTS').max(2),
  AI_TRANSIENT_RETRIES: nonNegativeInteger('AI_TRANSIENT_RETRIES').max(2),
  AI_RETRY_BASE_DELAY_MS: positiveInteger('AI_RETRY_BASE_DELAY_MS'),
  AI_MAX_RESPONSE_BYTES: positiveInteger('AI_MAX_RESPONSE_BYTES'),
  AI_GENERATION_WINDOW_MS: positiveInteger('AI_GENERATION_WINDOW_MS'),
  AI_GENERATION_MAX_REQUESTS: positiveInteger('AI_GENERATION_MAX_REQUESTS'),
  PROPOSAL_TOKEN_SECRET: requiredText('PROPOSAL_TOKEN_SECRET').min(
    32,
    'PROPOSAL_TOKEN_SECRET must contain at least 32 characters.'
  ).refine(
    (value) => !isPlaceholder(value),
    'PROPOSAL_TOKEN_SECRET still contains a placeholder value.'
  ),
  PROPOSAL_TOKEN_TTL: duration('PROPOSAL_TOKEN_TTL'),
  PROPOSAL_TOKEN_MAX_AGE: duration('PROPOSAL_TOKEN_MAX_AGE'),
}).passthrough()

function loadEnvironment(source = process.env) {
  const result = environmentSchema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${details}`)
  }

  return Object.freeze({
    ...result.data,
    FRONTEND_URL: result.data.FRONTEND_URL.replace(/\/+$/, ''),
  })
}

module.exports = { environmentSchema, loadEnvironment }
