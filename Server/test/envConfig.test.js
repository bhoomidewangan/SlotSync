const test = require('node:test')
const assert = require('node:assert/strict')
const { loadEnvironment } = require('../src/config/env')

const validEnvironment = {
  NODE_ENV: 'production',
  PORT: '10000',
  MONGODB_URI: 'mongodb+srv://user:secret@real-cluster.example/app',
  FRONTEND_URL: 'https://slotsync-frontend.example.com/',
  JWT_SECRET: 'a'.repeat(64),
  JWT_EXPIRES_IN: '7d',
  GEMINI_API_KEY: `AIza${'a'.repeat(32)}`,
  GEMINI_MODEL: 'gemini-3.5-flash',
  AI_REQUEST_TIMEOUT_MS: '90000',
  AI_REPAIR_ATTEMPTS: '1',
  AI_TRANSIENT_RETRIES: '2',
  AI_RETRY_BASE_DELAY_MS: '1000',
  AI_MAX_RESPONSE_BYTES: '1000000',
  AI_GENERATION_WINDOW_MS: '60000',
  AI_GENERATION_MAX_REQUESTS: '5',
  PROPOSAL_TOKEN_SECRET: 'b'.repeat(64),
  PROPOSAL_TOKEN_TTL: '2h',
  PROPOSAL_TOKEN_MAX_AGE: '2h',
}

test('loads and normalizes a complete production environment', () => {
  const env = loadEnvironment(validEnvironment)

  assert.equal(env.PORT, 10000)
  assert.equal(env.AI_REQUEST_TIMEOUT_MS, 90000)
  assert.equal(env.FRONTEND_URL, 'https://slotsync-frontend.example.com')
  assert.ok(Object.isFrozen(env))
})

test('fails startup when required environment variables are missing', () => {
  assert.throws(
    () => loadEnvironment({ NODE_ENV: 'production' }),
    (error) => error.message.includes('MONGODB_URI') &&
      error.message.includes('FRONTEND_URL') &&
      error.message.includes('GEMINI_API_KEY')
  )
})

test('rejects example placeholders as deployment values', () => {
  assert.throws(
    () => loadEnvironment({
      ...validEnvironment,
      FRONTEND_URL: 'https://YOUR-FRONTEND-SERVICE.onrender.com',
      JWT_SECRET: 'REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS',
    }),
    /placeholder/
  )
})
