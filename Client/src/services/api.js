import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, '')
const baseURL = normalizedBaseUrl.endsWith('/api')
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api`
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS)
const timeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0
  ? configuredTimeout
  : 180000

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout,
})

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const storage = localStorage.getItem('timetable-app-storage')
  if (storage) {
    const { state } = JSON.parse(storage)
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`
    }
  }
  return config
})

// Unwrap responses and surface error messages
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Token expired or invalid — clear storage and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('timetable-app-storage')
      window.location.href = '/login'
    }
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default api
