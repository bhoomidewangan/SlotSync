const { createAISchedulerService } = require('./aiSchedulerService')
const { loadSchedulingContext } = require('./schedulingContextService')
const { signProposalToken } = require('./proposalTokenService')

async function createTemporaryProposal({
  departmentId,
  semester,
  secret,
  aiService = createAISchedulerService(),
  contextLoader = loadSchedulingContext,
  now = () => new Date(),
  tokenExpiresIn,
}) {
  const context = await contextLoader({ departmentId, semester })
  if (context.courses.length === 0) {
    const error = new Error(`No courses found for Semester ${semester}.`)
    error.statusCode = 404
    throw error
  }

  const proposal = await aiService.generateProposal({
    request: {
      semester,
      courses: context.courses,
      teacherBlockedSlots: context.teacherBlockedSlots,
    },
    validationContext: {
      semester,
      departmentId,
      courses: context.courses,
      teacherBlockedSlots: context.teacherBlockedSlots,
    },
  })
  const generatedAt = now()
  const proposalToken = signProposalToken({
    proposal,
    departmentId,
    semester,
    secret,
    generatedAt,
    expiresIn: tokenExpiresIn,
  })

  return { proposal, proposalToken, generatedAt }
}

module.exports = { createTemporaryProposal }
