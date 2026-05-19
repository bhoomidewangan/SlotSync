import api from './api'

const courseService = {
  getAll: (semester)   => api.get('/courses', { params: semester ? { semester } : {} }),
  getById: (id)        => api.get(`/courses/${id}`),
  create: (data)       => api.post('/courses', data),
  update: (id, data)   => api.put(`/courses/${id}`, data),
  delete: (id)         => api.delete(`/courses/${id}`),
}

export default courseService