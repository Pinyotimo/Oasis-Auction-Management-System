import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — validate token before every request
api.interceptors.request.use((config) => {
  const { token, logout } = useAuthStore.getState()

  if (token) {
    // Validate token expiry before sending
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        logout()
        return Promise.reject(new Error('Token expired'))
      }
    } catch {
      logout()
      return Promise.reject(new Error('Invalid token'))
    }

    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Response interceptor — kill 401/403 floods immediately
api.interceptors.response.use(
  (response) => {
    console.log(`[API Success] ${response.config.method?.toUpperCase()} ${response.config.url}`)
    return response
  },
  (error) => {
    const status = error.response?.status

    console.error(
      `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} | Status: ${status} | Message: ${error.response?.data?.error || error.message}`
    )

    // Hard stop on auth failures — clear session and redirect
    if (status === 401 || status === 403) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api