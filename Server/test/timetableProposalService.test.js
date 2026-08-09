const test = require('node:test')
const assert = require('node:assert/strict')
const { createTemporaryProposal } = require('../src/services/timetableProposalService')
const { verifyProposalToken } = require('../src/services/proposalTokenService')

test('creates a signed temporary proposal without persistence dependencies', async () => {
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
  const courses = [{
    _id: 'course-1',
    teacher: { _id: 'teacher-1', department: 'department-1' },
    department: 'department-1',
    semester: 3,
    sessionsPerWeek: 1,
    periodsPerSession: 1,
  }]
  let aiArguments

  const result = await createTemporaryProposal({
    departmentId: 'department-1',
    semester: 3,
    secret: 'test-secret',
    contextLoader: async () => ({
      courses,
      existingTimetable: { _id: 'old-timetable' },
      teacherBlockedSlots: { 'teacher-1': ['TUE_P1'] },
    }),
    aiService: {
      async generateProposal(args) {
        aiArguments = args
        return proposal
      },
    },
    now: () => new Date('2026-08-06T10:00:00.000Z'),
  })

  assert.equal(aiArguments.request.courses, courses)
  assert.deepEqual(aiArguments.validationContext.teacherBlockedSlots, { 'teacher-1': ['TUE_P1'] })
  assert.deepEqual(result.proposal, proposal)
  assert.equal(result.generatedAt.toISOString(), '2026-08-06T10:00:00.000Z')
  assert.doesNotThrow(() => verifyProposalToken({
    token: result.proposalToken,
    proposal,
    departmentId: 'department-1',
    semester: 3,
    secret: 'test-secret',
  }))
})
