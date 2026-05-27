import axios from 'axios'
import { useAuthStore } from '../store/authStore' // Import your auth store path

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests directly from the store state
api.interceptors.request.use((config) => {
  // 1. Get the current active token string from your store state
  const state = useAuthStore.getState()
  const token = state.token // Alternatively, state.user?.token depending on your store setup

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// DEBUG: Log responses
api.interceptors.response.use(
  (response) => {
    console.log(`[API Success] ${response.config.method?.toUpperCase()} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} | Status: ${error.response?.status} | Message: ${error.response?.data?.error || error.message}`)
    return Promise.reject(error)
  }
)

export default api