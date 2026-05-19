import api from './api'

const teacherService = {
  getAll: ()           => api.get('/teachers'),
  getById: (id)        => api.get(`/teachers/${id}`),
  create: (data)       => api.post('/teachers', data),
  update: (id, data)   => api.put(`/teachers/${id}`, data),
  delete: (id)         => api.delete(`/teachers/${id}`),
}

export default teacherService