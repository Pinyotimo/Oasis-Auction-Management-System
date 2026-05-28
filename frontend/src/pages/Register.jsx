import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

function Register() {
  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '',
    role: 'buyer',
    name: '',        // ← ADDED
    companyName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    
    try {
      const response = await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        role: form.role,
        name: form.name || undefined,           // ← ADDED
        companyName: form.companyName || undefined
      })
      login(response.data.token, response.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card className="p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        
        {error && (
          <div className="bg-red-900/50 border border-red-800 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <Input 
              type="email" 
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Account Type</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              value={form.role}
              onChange={e => setForm({...form, role: e.target.value})}
            >
              <option value="buyer">Buyer — I want to bid on items</option>
              <option value="seller">Seller — I want to sell items</option>
            </select>
          </div>
          
          {form.role === 'seller' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <Input 
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  required={form.role === 'seller'}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company Name</label>
                <Input 
                  placeholder="Your company or store name"
                  value={form.companyName}
                  onChange={e => setForm({...form, companyName: e.target.value})}
                  required={form.role === 'seller'}
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={e => setForm({...form, confirmPassword: e.target.value})}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">
          Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Sign In</Link>
        </p>
      </Card>
    </div>
  )
}

export default Register