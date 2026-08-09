import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearProposal,
  showProposal,
  startProposalAcceptance,
  startProposalGeneration,
} from '../src/store/timetableProposalState.js'

const oldTimetable = { _id: 'old-timetable' }
const proposal = { semester: 3, sessions: [] }

test('generate, preview, and reject leaves the accepted timetable untouched', () => {
  let state = { acceptedTimetable: oldTimetable }
  state = startProposalGeneration(state)
  assert.equal(state.generationStatus, 'generating')

  state = showProposal(state, proposal, 'signed-token')
  assert.equal(state.generationStatus, 'preview')
  assert.equal(state.acceptedTimetable, oldTimetable)

  state = clearProposal(state)
  assert.equal(state.generationStatus, 'idle')
  assert.equal(state.timetableProposal, null)
  assert.equal(state.acceptedTimetable, oldTimetable)
})

test('acceptance can replace the accepted result before clearing temporary state', () => {
  let state = showProposal({ acceptedTimetable: oldTimetable }, proposal, 'signed-token')
  state = startProposalAcceptance(state)
  assert.equal(state.generationStatus, 'accepting')

  const acceptedTimetable = { _id: 'new-timetable' }
  state = clearProposal({ ...state, acceptedTimetable })
  assert.equal(state.acceptedTimetable, acceptedTimetable)
  assert.equal(state.timetableProposal, null)
  assert.equal(state.proposalToken, null)
})
