import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Gavel, Trophy, ShieldAlert, ArrowUpRight, RefreshCw, AlertCircle, Clock, Ban } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

function Profile() {
  const { user, isAuthenticated } = useAuthStore()
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Memoized fetch function allows manual refresh loops without layout teardown
  const fetchUserBids = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      else setRefreshing(true)
      
      const res = await api.get('/auctions/my-bids')
      setBids(res.data || [])
      setError(null)
    } catch (err) {
      console.error('Failed to capture user bid logs:', err)
      setError(err.response?.data?.error || 'Unable to balance your financial transaction ledger.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserBids(false)
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, fetchUserBids])

  // --- EXECUTIVE ACCOUNT METRICS COMPILATION ---
  const dashboardStats = useMemo(() => {
    return bids.reduce(
      (acc, bid) => {
        if (bid.status === 'won') {
          acc.wins += 1
          acc.totalCapitalAllocated += parseFloat(bid.amount || 0)
        } else if (bid.status === 'active' || bid.status === 'winning') {
          acc.activeBids += 1
          acc.activeExposure += parseFloat(bid.amount || 0)
        }
        return acc;
      },
      { wins: 0, activeBids: 0, activeExposure: 0, totalCapitalAllocated: 0 }
    )
  }, [bids])

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0)

  // Status Badge configurations mapping logic
  const getStatusConfig = (status) => {
    const normalized = status?.toLowerCase()
    switch (normalized) {
      case 'won':
        return { bg: 'bg-green-500/10 border-green-500/20 text-green-400', label: 'Secured / Won', icon: Trophy }
      case 'active':
      case 'winning':
        return { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', label: 'Active / High Bid', icon: Clock }
      case 'outbid':
        return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', label: 'Outbid / Falling behind', icon: AlertCircle }
      default:
        return { bg: 'bg-gray-500/10 border-gray-800 text-gray-400', label: status || 'Closed', icon: Ban }
    }
  }

  // Unauthenticated Workspace State
  if (!isAuthenticated) {
    return (
      <div className="text-center py-32 max-w-sm mx-auto space-y-6 px-4">
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl inline-block text-gray-500">
          <ShieldAlert size={36} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-white tracking-tight">Protected User Workspace</h2>
          <p className="text-gray-500 text-xs leading-relaxed">
            Please cross-verify authentication signatures to inspect dynamic portfolios or active financial tracking modules.
          </p>
        </div>
        <Link 
          to="/login" 
          className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition shadow-lg shadow-blue-600/10"
        >
          Sign In to Account
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold animate-pulse">Syncing investment desk...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-6">
      
      {/* --- DASHBOARD USER MATRICES PROFILE HEADER --- */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-950 to-gray-900/60 border border-gray-800/80 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <User size={24} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">Trader Dashboard</h1>
            <p className="text-gray-400 text-xs font-semibold flex items-center gap-1.5">
              <Mail size={12} className="text-gray-600" /> {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchUserBids(true)}
          disabled={refreshing}
          className="self-start sm:self-center bg-gray-950 hover:bg-gray-900 border border-gray-800 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-gray-200 transition flex items-center gap-2 disabled:opacity-40"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin text-blue-400' : ''} />
          {refreshing ? 'Refreshing...' : 'Sync Account'}
        </button>
      </div>

      {/* --- LIVE PORTFOLIO FINANCIAL METRIC TILES --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900/20 border border-gray-800/60 rounded-2xl p-4.5 space-y-1 shadow-md">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Exposure</p>
          <h3 className="text-xl font-black text-blue-400 tracking-tight">{formatCurrency(dashboardStats.activeExposure)}</h3>
          <p className="text-[10px] font-medium text-gray-600">{dashboardStats.activeBids} open lot positions</p>
        </div>
        <div className="bg-gray-900/20 border border-gray-800/60 rounded-2xl p-4.5 space-y-1 shadow-md">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Capital Allocated</p>
          <h3 className="text-xl font-black text-green-400 tracking-tight">{formatCurrency(dashboardStats.totalCapitalAllocated)}</h3>
          <p className="text-[10px] font-medium text-gray-600">Across settled winning clearings</p>
        </div>
        <div className="bg-gray-900/20 border border-gray-800/60 rounded-2xl p-4.5 space-y-1 shadow-md">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lot Acquisitions</p>
          <h3 className="text-xl font-black text-white tracking-tight">{dashboardStats.wins} Items</h3>
          <p className="text-[10px] font-medium text-gray-600">Hammer drops won</p>
        </div>
        <div className="bg-gray-900/20 border border-gray-800/60 rounded-2xl p-4.5 space-y-1 shadow-md">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Positions Held</p>
          <h3 className="text-xl font-black text-gray-300 tracking-tight">{bids.length}</h3>
          <p className="text-[10px] font-medium text-gray-600">Cumulative bid events</p>
        </div>
      </div>

      {/* --- BIDDING MANAGEMENT LEDGER --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
          <h2 className="text-base font-bold text-gray-200 tracking-tight flex items-center gap-2">
            <Gavel size={16} className="text-blue-500" />
            Transaction History Matrix
          </h2>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-semibold p-4 rounded-xl flex items-start gap-2.5">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {bids.length === 0 ? (
          <div className="border border-dashed border-gray-800 p-16 rounded-2xl text-center bg-gray-950/10 max-w-lg mx-auto">
            <Gavel className="mx-auto text-gray-700 mb-3" size={28} />
            <p className="text-gray-400 font-bold text-sm">No Active Asset Assignments</p>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed">
              You haven't dispatched bids across our liquid markets yet. Browse the home exchange listings to file your initial offer.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {bids.map((bid) => {
              const status = getStatusConfig(bid.status)
              const StatusIcon = status.icon

              return (
                <Link
                  key={bid.id}
                  to={`/auctions/${bid.auction_id || bid.id}`}
                  className="group block bg-gray-950/30 border border-gray-800/80 hover:border-gray-700/80 p-4.5 rounded-2xl transition-all shadow-md hover:shadow-xl relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-200 group-hover:text-blue-400 transition-colors">
                          {bid.auction_title || 'Premium Auction Lot'}
                        </span>
                        <ArrowUpRight size={14} className="text-gray-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-400 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] font-medium text-gray-500">
                        Signature filed on: {new Date(bid.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center sm:justify-end gap-4 self-start sm:self-center flex-row-reverse sm:flex-row w-full sm:w-auto justify-between">
                      {/* Interactive Badge Elements */}
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold border px-3 py-1 rounded-full ${status.bg}`}>
                        <StatusIcon size={11} /> {status.label}
                      </span>
                      
                      <p className="text-base font-black text-green-400 tracking-tight">
                        {formatCurrency(bid.amount)}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile