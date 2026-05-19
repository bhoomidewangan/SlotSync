import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set) => ({
      // Auth
      token: null,
      department: null,
      isAuthenticated: false,
      login: (token, department) => set({ token, department, isAuthenticated: true }),
      logout: () => set({ token: null, department: null, isAuthenticated: false, configId: null, generatedTimetable: null }),

      // App state
      selectedSemester: 1,
      setSelectedSemester: (sem) => set({ selectedSemester: sem }),

      configId: null,
      setConfigId: (id) => set({ configId: id }),

      generatedTimetable: null,
      setGeneratedTimetable: (timetable) => set({ generatedTimetable: timetable }),
      clearTimetable: () => set({ generatedTimetable: null }),
    }),
    {
      name: 'timetable-app-storage',
      partialize: (state) => ({
        token: state.token,
        department: state.department,
        isAuthenticated: state.isAuthenticated,
        selectedSemester: state.selectedSemester,
        configId: state.configId,
      }),
    }
  )
)

export default useAppStore