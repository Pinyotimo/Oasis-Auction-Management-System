import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, ImageIcon } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

function CreateAuction() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    reservePrice: '',
    startsAt: '',
    endsAt: '',
  })
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Please login to create an auction</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    )
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + images.length > 5) {
      alert('Maximum 5 images allowed')
      return
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Max 5MB.')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setImages(prev => [...prev, {
          file,
          preview: reader.result,
          name: file.name
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Upload images first (simulate - in production use S3/Cloudinary)
      setUploading(true)
      const uploadedUrls = images.map(img => img.preview) // Using base64 for MVP
      
      await api.post('/auctions', {
        title: form.title,
        description: form.description,
        category: form.category,
        reservePrice: parseFloat(form.reservePrice),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        photoUrls: uploadedUrls
      })
      
      alert('Auction created! Waiting for admin approval.')
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create auction')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Auction</h1>
      
      {error && (
        <div className="bg-red-900/50 border border-red-800 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title *</label>
            <Input 
              placeholder="e.g. Vintage Rolex Submariner"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description *</label>
            <textarea 
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition min-h-[100px]"
              placeholder="Describe your item in detail..."
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category *</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value})}
              required
            >
              <option value="">Select category</option>
              <option value="Watches">Watches</option>
              <option value="Electronics">Electronics</option>
              <option value="Collectibles">Collectibles</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Art">Art</option>
              <option value="Jewelry">Jewelry</option>
              <option value="Fashion">Fashion</option>
              <option value="Sports">Sports Memorabilia</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Reserve Price ($) *</label>
            <Input 
              type="number"
              min="1"
              step="0.01"
              placeholder="Minimum acceptable price"
              value={form.reservePrice}
              onChange={e => setForm({...form, reservePrice: e.target.value})}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Time *</label>
              <Input 
                type="datetime-local"
                value={form.startsAt}
                onChange={e => setForm({...form, startsAt: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Time *</label>
              <Input 
                type="datetime-local"
                value={form.endsAt}
                onChange={e => setForm({...form, endsAt: e.target.value})}
                required
              />
            </div>
          </div>
          
          {/* Image Upload Section */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Photos (Max 5, 5MB each)</label>
            
            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={img.preview} 
                      alt={img.name}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-gray-800/50 transition">
              <ImageIcon size={24} className="text-gray-400" />
              <span className="text-gray-400">Click to upload images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
          
          <Button type="submit" className="w-full" disabled={loading || uploading}>
            {uploading ? 'Uploading images...' : loading ? 'Creating...' : 'Create Auction'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default CreateAuction