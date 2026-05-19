import api from './api'

const timetableService = {
  saveConfig:             (data)      => api.post('/config', data),
  getConfig:              (id)        => api.get(`/config/${id}`),
  getConfigBySemester:    (semester)  => api.get(`/config?semester=${semester}`),
  generate:               (configId)  => api.post('/timetable/generate', { configId }),
  getTimetable:           (id)        => api.get(`/timetable/${id}`),
  getTimetableBySemester: (semester)  => api.get(`/timetable?semester=${semester}`),
  deleteTimetable:        (id)        => api.delete(`/timetable/${id}`),
}

export default timetableService