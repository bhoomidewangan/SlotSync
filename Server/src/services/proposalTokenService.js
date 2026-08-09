const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const TOKEN_ISSUER = 'slotsync'
const TOKEN_AUDIENCE = 'timetable-proposal'
const DEFAULT_PROPOSAL_TOKEN_TTL = '2h'

class ProposalTokenError extends Error {
  constructor(message, statusCode = 400, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'ProposalTokenError'
    this.code = 'INVALID_PROPOSAL_TOKEN'
    this.statusCode = statusCode
  }
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(',')}}`
  }
  return JSON.stringify(value)
}

function hashProposal(proposal) {
  return crypto.createHash('sha256').update(stableStringify(proposal)).digest('hex')
}

function requireSecret(secret) {
  if (!secret) {
    const error = new Error('A proposal signing secret is not configured.')
    error.statusCode = 500
    throw error
  }
  return secret
}

function signProposalToken({
  proposal,
  departmentId,
  semester,
  secret,
  expiresIn = DEFAULT_PROPOSAL_TOKEN_TTL,
  generatedAt = new Date(),
}) {
  return jwt.sign(
    {
      proposalHash: hashProposal(proposal),
      departmentId: String(departmentId),
      semester: Number(semester),
      generatedAt: generatedAt.toISOString(),
    },
    requireSecret(secret),
    { expiresIn, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE }
  )
}

function safeHashEquals(left, right) {
  const leftBuffer = Buffer.from(left || '', 'hex')
  const rightBuffer = Buffer.from(right || '', 'hex')
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function verifyProposalToken({
  token,
  proposal,
  departmentId,
  semester,
  secret,
  maxAge = DEFAULT_PROPOSAL_TOKEN_TTL,
  clockTimestamp,
}) {
  let payload
  try {
    payload = jwt.verify(token, requireSecret(secret), {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      clockTimestamp,
    })
  } catch (error) {
    if (error?.statusCode === 500) throw error
    if (error?.name !== 'TokenExpiredError') {
      throw new ProposalTokenError('The timetable proposal has expired or is invalid.', 400, { cause: error })
    }

    // Previously issued tokens expired after ten minutes. Accept them within
    // the new bounded lifetime so an already-generated proposal is not lost.
    try {
      payload = jwt.verify(token, requireSecret(secret), {
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        ignoreExpiration: true,
        maxAge,
        clockTimestamp,
      })
    } catch (graceError) {
      throw new ProposalTokenError(
        'The timetable proposal has expired or is invalid.',
        400,
        { cause: graceError }
      )
    }
  }

  const contextMatches = payload.departmentId === String(departmentId)
    && Number(payload.semester) === Number(semester)
  const proposalMatches = safeHashEquals(payload.proposalHash, hashProposal(proposal))

  if (!contextMatches || !proposalMatches) {
    throw new ProposalTokenError('The timetable proposal does not match the generated proposal.', 400)
  }

  return payload
}

module.exports = {
  DEFAULT_PROPOSAL_TOKEN_TTL,
  ProposalTokenError,
  hashProposal,
  signProposalToken,
  stableStringify,
  verifyProposalToken,
}
