import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, X, Gavel, Clock, Users, ShieldAlert, FileText,
  AlertCircle, CheckCircle2, ShieldCheck, RefreshCw, Search, Eye
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import api from '../lib/api'
import { formatKES } from '../lib/currency'
import { useAuthStore } from '../store/authStore'

// Rejection form sub-component
function RejectionForm({ onCancel, onSubmit, isSubmitting }) {
  const [reason, setReason] = useState('')

  return (
    <div className="flex flex-col gap-2 w-full bg-gray-950 p-4 rounded-xl border border-red-500/10 shadow-inner animate-fadeIn">
      <textarea
        placeholder="Provide rejection reason..."
        value={reason}
        disabled={isSubmitting}
        onChange={(e) => setReason(e.target.value)}
        className="text-xs bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 resize-none h-20 w-full font-medium leading-relaxed transition-all"
      />
      <div className="flex gap-2 justify-end items-center">
        <button
          type="button"
          disabled={isSubmitting}
          className="text-[11px] font-bold text-gray-500 hover:text-gray-300 px-2 py-1 transition"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!reason.trim() || isSubmitting}
          className="bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:hover:bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-red-900/20 transition-all flex items-center gap-1"
          onClick={() => onSubmit(reason)}
        >
          {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
        </button>
      </div>
    </div>
  )
}

// Auction detail modal
function AuctionDetailModal({ auction, onClose }) {
  if (!auction) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-bold text-white">{auction.title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {auction.photo_urls?.[0] && (
            <img
              src={auction.photo_urls[0]}
              alt={auction.title}
              className="w-full h-48 object-cover rounded-xl border border-gray-800"
            />
          )}

          <p className="text-gray-400 text-sm leading-relaxed">{auction.description}</p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
              <p className="text-gray-500 font-bold uppercase tracking-wider mb-1">Reserve Price</p>
              <p className="text-green-400 font-bold text-lg">
                {formatKES(parseFloat(auction.reserve_price))}
              </p>
            </div>
            <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
              <p className="text-gray-500 font-bold uppercase tracking-wider mb-1">Seller</p>
              <p className="text-gray-300 font-medium">{auction.seller_email}</p>
            </div>
            <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
              <p className="text-gray-500 font-bold uppercase tracking-wider mb-1">Category</p>
              <p className="text-gray-300 font-medium">{auction.category || 'Uncategorized'}</p>
            </div>
            <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
              <p className="text-gray-500 font-bold uppercase tracking-wider mb-1">Ends At</p>
              <p className="text-gray-300 font-medium">
                {new Date(auction.ends_at).toLocaleString()}
              </p>
            </div>
          </div>

          {auction.rejection_reason && (
            <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg">
              <p className="text-red-400 text-xs font-bold">Rejection Reason:</p>
              <p className="text-red-300 text-xs mt-1">{auction.rejection_reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AdminDashboard() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [pendingAuctions, setPendingAuctions] = useState([])
  const [expiredAuctions, setExpiredAuctions] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('auctions')

  const [busyAuctionIds, setBusyAuctionIds] = useState(new Set())
  const [busyUserIds, setBusyUserIds] = useState(new Set())
  const [rejectingAuctionId, setRejectingAuctionId] = useState(null)
  const [viewingAuction, setViewingAuction] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const USER_PAGE_SIZE = 10

  const [notification, setNotification] = useState({ type: null, message: '' })

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification({ type: null, message: '' }), 4000)
  }, [])

  const fetchData = useCallback(async (isInitialFetch = false) => {
    if (isInitialFetch) setLoading(true)
    setError(null)

    try {
      let auctionsRes, expiredRes, usersRes
      let hasError = false

      try {
        auctionsRes = await api.get('/admin/pending')
        console.log('✅ Pending OK:', auctionsRes.data?.length, 'items')
      } catch (e) {
        console.error('❌ Pending FAILED:', e.response?.status, e.response?.data || e.message)
        hasError = true
      }

      try {
        expiredRes = await api.get('/admin/expired')
        console.log('✅ Expired OK:', expiredRes.data?.length, 'items')
      } catch (e) {
        console.error('❌ Expired FAILED:', e.response?.status, e.response?.data || e.message)
        hasError = true
      }

      try {
        usersRes = await api.get('/admin/users')
        console.log('✅ Users OK:', usersRes.data?.length, 'items')
      } catch (e) {
        console.error('❌ Users FAILED:', e.response?.status, e.response?.data || e.message)
        hasError = true
      }

      setPendingAuctions(auctionsRes?.data || [])
      setExpiredAuctions(expiredRes?.data || [])
      setUsers(usersRes?.data || [])

      if (hasError && !auctionsRes && !expiredRes && !usersRes) {
        setError('System metrics synchronization breakdown.')
      }
    } catch (err) {
      setError('System metrics synchronization breakdown.')
      console.error(err)
    } finally {
      if (isInitialFetch) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (user?.role !== 'admin') {
      navigate('/')
      return
    }
    fetchData(true)
  }, [isAuthenticated, user?.role])

  const handleApprove = async (auctionId) => {
    if (busyAuctionIds.has(auctionId)) return
    try {
      setBusyAuctionIds(prev => new Set(prev).add(auctionId))
      await api.post(`/admin/auctions/${auctionId}/approve`)
      setPendingAuctions(prev => prev.filter(a => a.id !== auctionId))
      showNotification('success', 'Auction approved and moved to live floor.')
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Approval failed.')
    } finally {
      setBusyAuctionIds(prev => { const n = new Set(prev); n.delete(auctionId); return n })
    }
  }

  const handleRejectSubmit = async (auctionId, reason) => {
    try {
      setBusyAuctionIds(prev => new Set(prev).add(auctionId))
      await api.post(`/admin/auctions/${auctionId}/reject`, { reason })
      setPendingAuctions(prev => prev.filter(a => a.id !== auctionId))
      setRejectingAuctionId(null)
      showNotification('success', 'Auction rejected. Seller notified.')
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Rejection failed.')
    } finally {
      setBusyAuctionIds(prev => { const n = new Set(prev); n.delete(auctionId); return n })
    }
  }

  const handleVerifyUser = async (userId) => {
    if (busyUserIds.has(userId)) return
    try {
      setBusyUserIds(prev => new Set(prev).add(userId))
      await api.post(`/admin/users/${userId}/verify`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, verified: true } : u))
      showNotification('success', 'User verified successfully.')
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Verification failed.')
    } finally {
      setBusyUserIds(prev => { const n = new Set(prev); n.delete(userId); return n })
    }
  }

  const formatCurrency = formatKES

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.company_name?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const paginatedUsers = filteredUsers.slice(0, userPage * USER_PAGE_SIZE)
  const hasMoreUsers = paginatedUsers.length < filteredUsers.length

  const totalPendingAuctions = pendingAuctions.length
  const totalExpiredAuctions = expiredAuctions.length
  const totalUsers = users.length
  const unverifiedSellers = users.filter(u => u.role === 'seller' && !u.verified).length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
        <p className="text-gray-500 text-xs font-semibold tracking-wider uppercase animate-pulse">
          Syncing core registry logs...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20 max-w-sm mx-auto space-y-5">
        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl inline-block text-red-400">
          <AlertCircle size={36} />
        </div>
        <div>
          <p className="text-gray-200 font-black text-lg tracking-tight">{error}</p>
          <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
            Check browser console for which endpoint failed. Ensure admin routes exist in backend.
          </p>
        </div>
        <Button onClick={() => fetchData(true)} className="w-full font-bold py-2.5">
          Re-establish Connection
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/60 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="text-blue-500" size={26} />
            Command Terminal
          </h1>
          <p className="text-gray-500 text-xs font-medium mt-1">
            Clearance: <span className="text-blue-400 font-bold uppercase">{user?.role}</span> • Real-time operational logs
          </p>
        </div>
        <button
          onClick={() => fetchData(false)}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* Notification */}
      {notification.message && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3 animate-slideIn ${
          notification.type === 'error'
            ? 'bg-red-950/80 border-red-500/30 text-red-300'
            : 'bg-gray-950/80 border-green-500/30 text-green-300'
        }`}>
          {notification.type === 'error'
            ? <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            : <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
          }
          <p className="text-xs font-semibold leading-relaxed">{notification.message}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 bg-gray-900/20 border-gray-800/80 flex items-center justify-between shadow-xl">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pending Review</p>
            <h3 className="text-3xl font-black text-white tracking-tight">{totalPendingAuctions}</h3>
          </div>
          <div className="p-3 bg-yellow-500/5 text-yellow-500 border border-yellow-500/10 rounded-xl shadow-inner">
            <Gavel size={20} />
          </div>
        </Card>
        <Card className="p-5 bg-gray-900/20 border-gray-800/80 flex items-center justify-between shadow-xl">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Expired Auctions</p>
            <h3 className="text-3xl font-black text-white tracking-tight">{totalExpiredAuctions}</h3>
          </div>
          <div className="p-3 bg-red-500/5 text-red-500 border border-red-500/10 rounded-xl shadow-inner">
            <Clock size={20} />
          </div>
        </Card>
        <Card className="p-5 bg-gray-900/20 border-gray-800/80 flex items-center justify-between shadow-xl">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Users</p>
            <h3 className="text-3xl font-black text-white tracking-tight">{totalUsers}</h3>
          </div>
          <div className="p-3 bg-blue-500/5 text-blue-500 border border-blue-500/10 rounded-xl shadow-inner">
            <Users size={20} />
          </div>
        </Card>
        <Card className="p-5 bg-gray-900/20 border-gray-800/80 flex items-center justify-between shadow-xl">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unverified Sellers</p>
            <h3 className="text-3xl font-black text-white tracking-tight">{unverifiedSellers}</h3>
          </div>
          <div className="p-3 bg-purple-500/5 text-purple-500 border border-purple-500/10 rounded-xl shadow-inner">
            <FileText size={20} />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800/80">
        {[
          { id: 'auctions', label: 'Moderation Queue', count: totalPendingAuctions },
          { id: 'expired', label: 'Expired', count: totalExpiredAuctions },
          { id: 'users', label: 'User Registry', count: totalUsers }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setRejectingAuctionId(null) }}
            className={`pb-3.5 px-4 font-bold text-xs uppercase tracking-wider transition-all relative ${
              activeTab === tab.id ? 'text-blue-400 font-extrabold' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label} ({tab.count})
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-lg shadow-blue-500" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'auctions' && (
        <div className="space-y-4">
          {pendingAuctions.length === 0 ? (
            <Card className="border-dashed border-gray-800/80 p-16 text-center max-w-xl mx-auto bg-gray-900/5">
              <ShieldCheck className="mx-auto text-gray-700 mb-3" size={32} />
              <p className="text-gray-400 font-bold text-sm">Review Queue Clear</p>
              <p className="text-gray-500 text-xs mt-1">All submissions verified.</p>
            </Card>
          ) : (
            pendingAuctions.map(auction => {
              const isAuctionBusy = busyAuctionIds.has(auction.id)
              return (
                <Card key={auction.id} className="p-5 bg-gray-900/10 border-gray-800 hover:border-gray-700/80 transition shadow-lg">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                      <img
                        src={auction.photo_urls?.[0] || 'https://via.placeholder.com/120?text=No+Image'}
                        alt={auction.title}
                        className="w-24 h-24 object-cover rounded-xl border border-gray-800 bg-gray-950 flex-shrink-0"
                      />
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className="font-bold text-base text-gray-100 cursor-pointer hover:text-blue-400 transition"
                            onClick={() => setViewingAuction(auction)}
                          >
                            {auction.title}
                          </h3>
                          <Badge variant="warning" className="text-[9px] uppercase tracking-wider px-2 py-0.5 font-bold">
                            Pending
                          </Badge>
                          <button
                            onClick={() => setViewingAuction(auction)}
                            className="text-gray-500 hover:text-blue-400 transition"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 max-w-2xl">
                          {auction.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1 text-[11px] font-semibold text-gray-500">
                          <span className="flex items-center gap-1.5 text-gray-300">
                            <Gavel size={13} className="text-blue-500" />
                            Reserve: <strong className="text-green-400">{formatCurrency(auction.reserve_price)}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-gray-600" />
                            Seller: <span className="text-gray-400">{auction.seller_email}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-gray-600" />
                            Ends: <span className="text-gray-400">{new Date(auction.ends_at).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-stretch lg:items-center gap-2 self-end lg:self-center min-w-[220px]">
                      {rejectingAuctionId !== auction.id ? (
                        <>
                          <Button
                            variant="success"
                            disabled={isAuctionBusy}
                            onClick={() => handleApprove(auction.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 font-bold"
                          >
                            <Check size={13} />
                            {isAuctionBusy ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button
                            variant="danger"
                            disabled={isAuctionBusy}
                            onClick={() => setRejectingAuctionId(auction.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 font-bold"
                          >
                            <X size={13} />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <RejectionForm
                          isSubmitting={isAuctionBusy}
                          onCancel={() => setRejectingAuctionId(null)}
                          onSubmit={(reason) => handleRejectSubmit(auction.id, reason)}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'expired' && (
        <div className="space-y-4">
          {expiredAuctions.length === 0 ? (
            <Card className="border-dashed border-gray-800/80 p-16 text-center max-w-xl mx-auto bg-gray-900/5">
              <Clock className="mx-auto text-gray-700 mb-3" size={32} />
              <p className="text-gray-400 font-bold text-sm">No Expired Auctions</p>
              <p className="text-gray-500 text-xs mt-1">All auctions are active or pending.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Seller</th>
                    <th className="px-6 py-4">Final Price</th>
                    <th className="px-6 py-4">Ended</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-xs font-medium">
                  {expiredAuctions.map(auction => (
                    <tr key={auction.id} className="hover:bg-gray-900/20 transition-colors">
                      <td className="px-6 py-4 text-gray-200 font-semibold">{auction.title}</td>
                      <td className="px-6 py-4 text-gray-400">{auction.seller_email}</td>
                      <td className="px-6 py-4 text-green-400 font-bold">
                        {formatCurrency(auction.final_price || auction.reserve_price)}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(auction.ends_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={auction.status === 'completed' ? 'success' : 'default'} className="text-[9px]">
                          {auction.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <Input
                type="text"
                placeholder="Search by name, email or company..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1) }}
                className="pl-10 bg-gray-950 border-gray-800 focus:border-blue-500/80 w-full rounded-xl text-xs"
              />
            </div>
          </div>

          <Card className="overflow-hidden border-gray-800 bg-gray-900/10 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-xs font-medium">
                  {paginatedUsers.map(u => {
                    const isUserBusy = busyUserIds.has(u.id)
                    return (
                      <tr key={u.id} className="hover:bg-gray-900/20 transition-colors">
                        <td className="px-6 py-4 text-gray-200 font-semibold">{u.email}</td>
                        
                        {/* ← NAME COLUMN: Added missing data cell */}
                        <td className="px-6 py-4 text-gray-300">
                          {u.name || <span className="text-gray-600 italic">—</span>}
                        </td>
                        
                        <td className="px-6 py-4">
                          <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'seller' ? 'warning' : 'default'} className="text-[9px] uppercase font-bold">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {u.company_name || <span className="text-gray-600 italic">Private</span>}
                        </td>
                        <td className="px-6 py-4">
                          {u.verified ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-green-400 font-bold bg-green-500/5 px-2.5 py-1 rounded-full border border-green-500/10">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-yellow-500 font-bold bg-yellow-500/5 px-2.5 py-1 rounded-full border border-yellow-500/10">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!u.verified && (
                            <Button
                              variant="secondary"
                              disabled={isUserBusy}
                              onClick={() => handleVerifyUser(u.id)}
                              className="text-xs px-3.5 py-1.5 font-bold hover:bg-gray-800 bg-gray-900 border-gray-800 text-gray-300"
                            >
                              {isUserBusy ? 'Processing...' : 'Verify'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {hasMoreUsers && (
            <div className="text-center">
              <button
                onClick={() => setUserPage(p => p + 1)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition border border-gray-700"
              >
                Load More ({filteredUsers.length - paginatedUsers.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Auction Detail Modal */}
      {viewingAuction && (
        <AuctionDetailModal
          auction={viewingAuction}
          onClose={() => setViewingAuction(null)}
        />
      )}
    </div>
  )
}

export default AdminDashboard