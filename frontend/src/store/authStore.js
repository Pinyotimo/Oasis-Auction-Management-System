import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  
  login: (token, user) => {
    localStorage.setItem('token', token)
    set({ user, token, isAuthenticated: true })
  },
  
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false })
  },
  
  setUser: (user) => set({ user }),
  
  initAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      
      const decoded = JSON.parse(jsonPayload)
      set({ 
        user: { id: decoded.userId, email: decoded.email, role: decoded.role },
        token,
        isAuthenticated: true 
      })
    } catch (err) {
      console.error('Auth init failed:', err)
      localStorage.removeItem('token')
      set({ user: null, token: null, isAuthenticated: false })
    }
  }
}))