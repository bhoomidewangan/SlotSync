import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  INITIAL_PROPOSAL_STATE,
  clearProposal,
  restoreProposalPreview,
  showProposal,
  startProposalAcceptance,
  startProposalGeneration,
} from './timetableProposalState'

const useAppStore = create(
  persist(
    (set) => ({
      // Auth
      token: null,
      department: null,
      isAuthenticated: false,
      login: (token, department) => set({ token, department, isAuthenticated: true }),
      logout: () => set({
        token: null,
        department: null,
        isAuthenticated: false,
        timetableProposal: null,
        proposalToken: null,
        generationStatus: 'idle',
      }),

      // App state
      selectedSemester: 1,
      setSelectedSemester: (sem) => set({ selectedSemester: sem }),

      // Temporary generation state. Deliberately excluded from persisted storage.
      ...INITIAL_PROPOSAL_STATE,
      startTimetableGeneration: () => set(startProposalGeneration),
      setTimetableProposal: (proposal, proposalToken) => set(
        state => showProposal(state, proposal, proposalToken)
      ),
      startTimetableAcceptance: () => set(startProposalAcceptance),
      restoreTimetablePreview: () => set(restoreProposalPreview),
      clearTimetableProposal: () => set(clearProposal),
    }),
    {
      name: 'timetable-app-storage',
      version: 2,
      migrate: (persistedState) => {
        const state = { ...(persistedState || {}) }
        delete state.configId
        delete state.generatedTimetable
        return state
      },
      partialize: (state) => ({
        token: state.token,
        department: state.department,
        isAuthenticated: state.isAuthenticated,
        selectedSemester: state.selectedSemester,
      }),
    }
  )
)

export default useAppStore
