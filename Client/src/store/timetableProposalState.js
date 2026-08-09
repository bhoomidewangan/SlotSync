export const INITIAL_PROPOSAL_STATE = Object.freeze({
  timetableProposal: null,
  proposalToken: null,
  generationStatus: 'idle',
})

export function startProposalGeneration(state) {
  return {
    ...state,
    timetableProposal: null,
    proposalToken: null,
    generationStatus: 'generating',
  }
}

export function showProposal(state, proposal, proposalToken) {
  return { ...state, timetableProposal: proposal, proposalToken, generationStatus: 'preview' }
}

export function startProposalAcceptance(state) {
  return { ...state, generationStatus: 'accepting' }
}

export function restoreProposalPreview(state) {
  return { ...state, generationStatus: 'preview' }
}

export function clearProposal(state) {
  return { ...state, ...INITIAL_PROPOSAL_STATE }
}
