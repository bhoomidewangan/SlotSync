const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const {
  hashProposal,
  signProposalToken,
  verifyProposalToken,
} = require('../src/services/proposalTokenService')

const proposal = {
  semester: 3,
  sessions: [{
    courseId: 'course-1',
    teacherId: 'teacher-1',
    day: 'Monday',
    periods: ['P1'],
    slotIds: ['MON_P1'],
  }],
}

test('proposal hashes are stable across object key order', () => {
  assert.equal(
    hashProposal(proposal),
    hashProposal({ sessions: proposal.sessions, semester: 3 })
  )
})

test('proposal tokens bind the exact proposal and department context', () => {
  const token = signProposalToken({
    proposal,
    departmentId: 'department-1',
    semester: 3,
    secret: 'test-secret',
    generatedAt: new Date('2026-08-06T10:00:00.000Z'),
  })
  const payload = verifyProposalToken({
    token,
    proposal,
    departmentId: 'department-1',
    semester: 3,
    secret: 'test-secret',
  })

  assert.equal(payload.generatedAt, '2026-08-06T10:00:00.000Z')
  assert.throws(() => verifyProposalToken({
    token,
    proposal: { ...proposal, sessions: [] },
    departmentId: 'department-1',
    semester: 3,
    secret: 'test-secret',
  }), /does not match/)
  assert.throws(() => verifyProposalToken({
    token,
    proposal,
    departmentId: 'department-2',
    semester: 3,
    secret: 'test-secret',
  }), /does not match/)
})

test('accepts a previously issued short-lived token within the two-hour grace period', () => {
  const token = signProposalToken({
    proposal,
    departmentId: 'department-1',
    semester: 3,
    secret: 'test-secret',
    expiresIn: '10m',
  })
  const issuedAt = jwt.decode(token).iat

  assert.doesNotThrow(() => verifyProposalToken({
    token,
    proposal,
    departmentId: 'department-1',
    semester: 3,
    secret: 'test-secret',
    maxAge: '2h',
    clockTimestamp: issuedAt + (30 * 60),
  }))

  assert.throws(() => verifyProposalToken({
    token,
    proposal,
    departmentId: 'department-1',
    semester: 3,
    secret: 'test-secret',
    maxAge: '2h',
    clockTimestamp: issuedAt + (2 * 60 * 60) + 1,
  }), /expired or is invalid/)
})
