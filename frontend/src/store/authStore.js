import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isReady: false,

  login: (token, user) => {
    localStorage.setItem('token', token)
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user }),

  // Get current auth state without re-rendering
  getToken: () => get().token,
  getUser: () => get().user,

  initAuth: async () => {
    const token = localStorage.getItem('token')

    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isReady: true })
      return
    }

    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map((c) =>
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      )

      const decoded = JSON.parse(jsonPayload)

      // Check token expiration
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.warn('Token expired during init — clearing session.')
        localStorage.removeItem('token')
        set({ user: null, token: null, isAuthenticated: false, isReady: true })
        return
      }

      set({
        user: {
          id: decoded.userId || decoded.id,
          email: decoded.email,
          name: decoded.name || null,
          role: decoded.role,
        },
        token,
        isAuthenticated: true,
        isReady: true,
      })
    } catch (err) {
      console.error('Auth init failed:', err)
      localStorage.removeItem('token')
      set({ user: null, token: null, isAuthenticated: false, isReady: true })
    }
  },
}))