const Timetable = require('../models/Timetable')
const asyncWrapper = require('../middleware/asyncWrapper')
const { createTemporaryProposal } = require('../services/timetableProposalService')
const { verifyProposalToken } = require('../services/proposalTokenService')
const { acceptTimetableProposal } = require('../services/timetableAcceptanceService')
const { deleteTimetableWithBookings } = require('../services/deletionSafetyService')

function proposalSecret() {
  return process.env.PROPOSAL_TOKEN_SECRET || process.env.JWT_SECRET
}

const generate = asyncWrapper(async (req, res) => {
  const { semester } = req.body
  const result = await createTemporaryProposal({
    departmentId: req.department._id,
    semester,
    secret: proposalSecret(),
    tokenExpiresIn: process.env.PROPOSAL_TOKEN_TTL,
  })

  res.status(200).json(result)
})

const accept = asyncWrapper(async (req, res) => {
  const { semester, proposal, proposalToken } = req.body
  const departmentId = req.department._id
  const tokenPayload = verifyProposalToken({
    token: proposalToken,
    proposal,
    departmentId,
    semester,
    secret: proposalSecret(),
    maxAge: process.env.PROPOSAL_TOKEN_MAX_AGE || process.env.PROPOSAL_TOKEN_TTL,
  })

  const timetable = await acceptTimetableProposal({
    departmentId,
    semester,
    proposal,
    generatedAt: tokenPayload.generatedAt,
  })

  res.status(200).json(timetable)
})

const getTimetable = asyncWrapper(async (req, res) => {
  const timetable = await Timetable.findOne({ _id: req.params.id, department: req.department._id })
  if (!timetable) return res.status(404).json({ message: 'Timetable not found' })
  res.json(timetable)
})

const getTimetableBySemester = asyncWrapper(async (req, res) => {
  const { semester } = req.query
  if (!semester) return res.status(400).json({ message: 'semester query param required' })
  const timetable = await Timetable.findOne({ semester: Number(semester), department: req.department._id })
    .sort({ generatedAt: -1 })
  if (!timetable) return res.status(404).json({ message: 'No timetable found for this semester' })
  res.json(timetable)
})

const deleteTimetable = asyncWrapper(async (req, res) => {
  const timetable = await deleteTimetableWithBookings({
    timetableId: req.params.id,
    departmentId: req.department._id,
  })
  if (!timetable) return res.status(404).json({ message: 'Timetable not found' })
  res.json({ message: 'Timetable deleted' })
})

module.exports = { accept, generate, getTimetable, getTimetableBySemester, deleteTimetable }
