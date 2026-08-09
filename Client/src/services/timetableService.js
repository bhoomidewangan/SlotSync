import api from './api'

const timetableService = {
  generateProposal: (semester) => api.post('/timetable/generate', { semester }),
  acceptProposal: (data) => api.post('/timetable/accept', data),
  getBySemester: (semester) => api.get('/timetable', { params: { semester } }),
  deleteTimetable: (id) => api.delete(`/timetable/${id}`),
}

export default timetableService
