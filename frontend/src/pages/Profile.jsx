import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  User, Mail, Gavel, Trophy, ShieldAlert,
  ArrowUpRight, RefreshCw, AlertCircle, Clock, Ban,
  TrendingUp, Package
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { formatKES } from '../lib/currency'

function Profile() {
  const { user, isAuthenticated } = useAuthStore()
  const [bids, setBids] = useState([])
  const [auctionData, setAuctionData] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchAuctionHighBids = useCallback(async (bidList) => {
    if (!bidList.length) return

    const auctionIds = [...new Set(bidList.map(b => b.auction_id).filter(Boolean))]

    try {
      const results = await Promise.allSettled(
        auctionIds.map(id => api.get(`/auctions/${id}`))
      )

      const dataMap = {}
      results.forEach((result, index) => {
        const auctionId = auctionIds[index]
        if (result.status === 'fulfilled') {
          const auction = result.value.data
          
          const highestBid = 
            auction.current_highest_bid ?? 
            auction.currentHighestBid ?? 
            auction.highest_bid ?? 
            auction.highestBid ?? 
            auction.current_price ??
            auction.currentPrice ??
            0

          dataMap[auctionId] = {
            currentHighestBid: parseFloat(highestBid) || 0,
            auctionStatus: auction.status || 'unknown',
            endTime: auction.end_time || auction.endTime,
            title: auction.title || auction.name || auction.item_name || 'Auction lot',
            imageUrl: auction.image_url || auction.imageUrl || auction.image || null,
          }
        }
      })

      setAuctionData(dataMap)
    } catch (err) {
      console.error('Failed to fetch auction data:', err)
    }
  }, [])

  const fetchUserBids = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      else setRefreshing(true)
      
      const res = await api.get('/auctions/my-bids')
      const bidList = res.data || []
      setBids(bidList)
      setError(null)
      await fetchAuctionHighBids(bidList)
    } catch (err) {
      console.error('Failed to fetch user bids:', err)
      setError(err.response?.data?.error || 'Unable to load your bid history.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchAuctionHighBids])

  useEffect(() => {
    if (isAuthenticated) fetchUserBids(false)
    else setLoading(false)
  }, [isAuthenticated, fetchUserBids])

  const getBidRealtimeStatus = useCallback((bid) => {
    const auctionId = bid.auction_id
    const auction = auctionData[auctionId]
    
    if (!auction) {
      return bid.status
    }

    if (auction.auctionStatus === 'closed' || auction.auctionStatus === 'ended') {
      return bid.status
    }

    const bidAmount = parseFloat(bid.amount || 0)
    const currentHighest = auction.currentHighestBid

    const EPSILON = 0.001
    const isWinning = Math.abs(bidAmount - currentHighest) < EPSILON || bidAmount > currentHighest

    if (isWinning) {
      return 'winning'
    } else {
      return 'outbid'
    }
  }, [auctionData])

  const stats = useMemo(() => {
    return bids.reduce(
      (acc, bid) => {
        const realtimeStatus = getBidRealtimeStatus(bid)
        
        if (bid.status === 'won' && (realtimeStatus === 'winning' || realtimeStatus === 'outbid')) {
          if (bid.status === 'won') {
            acc.wins += 1
            acc.totalSpent += parseFloat(bid.amount || 0)
          }
        } else if (realtimeStatus === 'winning') {
          acc.activeBids += 1
          acc.activeExposure += parseFloat(bid.amount || 0)
        }
        return acc
      },
      { wins: 0, activeBids: 0, activeExposure: 0, totalSpent: 0 }
    )
  }, [bids, getBidRealtimeStatus])

  const fmt = formatKES

  const formatTime = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusConfig = useCallback((bid) => {
    const realtimeStatus = getBidRealtimeStatus(bid)
    
    switch (realtimeStatus?.toLowerCase()) {
      case 'won':
        return {
          classes: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
          label: 'Won',
          icon: Trophy,
        }
      case 'winning':
        return {
          classes: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
          label: 'Winning',
          icon: Clock,
        }
      case 'outbid':
        return {
          classes: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
          label: 'Outbid',
          icon: AlertCircle,
        }
      default:
        return {
          classes: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500',
          label: realtimeStatus || 'Closed',
          icon: Ban,
        }
    }
  }, [getBidRealtimeStatus])

  // ── Unauthenticated ──
  if (!isAuthenticated) {
    return (
      <div className="text-center py-32 max-w-sm mx-auto space-y-5 px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400">
          <ShieldAlert size={24} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Sign in to view your profile</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Track your bids, wins, and active positions from your personal dashboard.
          </p>
        </div>
        <Link
          to="/login"
          className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-xl transition"
        >
          Sign in
        </Link>
      </div>
    )
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-blue-500" />
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium animate-pulse">
          Loading profile...
        </p>
      </div>
    )
  }

  // ── Main ──
  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <User size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-gray-900 dark:text-white leading-tight">
              My dashboard
            </h1>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Mail size={12} aria-hidden="true" />
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchUserBids(true)}
          disabled={refreshing}
          className="self-start sm:self-center flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-2 rounded-xl transition disabled:opacity-40"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin text-blue-500' : ''} aria-hidden="true" />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Active exposure',
            value: fmt(stats.activeExposure),
            sub: `${stats.activeBids} open ${stats.activeBids === 1 ? 'bid' : 'bids'}`,
            valueClass: 'text-blue-600 dark:text-blue-400',
          },
          {
            label: 'Total spent',
            value: fmt(stats.totalSpent),
            sub: 'On won auctions',
            valueClass: 'text-green-600 dark:text-green-400',
          },
          {
            label: 'Auctions won',
            value: stats.wins,
            sub: 'All time',
            valueClass: 'text-gray-900 dark:text-white',
          },
          {
            label: 'Total bids',
            value: bids.length,
            sub: 'Across all auctions',
            valueClass: 'text-gray-900 dark:text-white',
          },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
          >
            <p className="text-[11px] text-gray-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-medium ${stat.valueClass}`}>{stat.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Profit Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-green-500" />
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Profit overview</h2>
        </div>

        {bids.filter(b => getBidRealtimeStatus(b) === 'won').length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <Package size={24} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
            <p className="text-gray-500 text-sm">No won auctions yet</p>
            <p className="text-gray-400 text-xs mt-1">Win auctions to see your profit breakdown here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bids
              .filter(bid => getBidRealtimeStatus(bid) === 'won')
              .map(bid => {
                const auction = auctionData[bid.auction_id]
                const itemName = auction?.title || bid.auction_title || 'Auction lot'
                const profit = parseFloat(bid.profit || bid.estimated_profit || 0)
                const cost = parseFloat(bid.amount || 0)
                const revenue = parseFloat(bid.sold_for || bid.market_value || cost + profit)

                return (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                        <Package size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {itemName}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Won for {fmt(cost)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}{fmt(profit)}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Est. value {fmt(revenue)}
                      </p>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Bid history */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Gavel size={15} className="text-blue-500" aria-hidden="true" />
            Bid history
          </h2>
          {bids.length > 0 && (
            <span className="text-[11px] text-gray-400">
              {bids.length} {bids.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium p-4 rounded-xl">
            <AlertCircle size={14} className="mt-px flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {bids.length === 0 && !error ? (
          <div className="border border-dashed border-gray-200 dark:border-gray-800 p-16 rounded-2xl text-center max-w-md mx-auto">
            <Gavel className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={26} aria-hidden="true" />
            <p className="text-gray-500 font-medium text-sm">No bids yet</p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              Browse the catalog and place your first bid.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Browse auctions <ArrowUpRight size={12} />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {bids.map(bid => {
              const status = getStatusConfig(bid)
              const StatusIcon = status.icon
              const auction = auctionData[bid.auction_id]
              const itemName = auction?.title || bid.auction_title || 'Auction lot'

              return (
                <Link
                  key={bid.id}
                  to={`/auctions/${bid.auction_id}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 px-4 py-3.5 rounded-xl transition-colors"
                >
                  {/* Left */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {itemName}
                      </span>
                      <ArrowUpRight
                        size={13}
                        className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={10} aria-hidden="true" />
                        {formatTime(bid.created_at)}
                      </span>
                      {bid.bid_time && bid.bid_time !== bid.created_at && (
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                          Placed at {formatTime(bid.bid_time)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-3 flex-shrink-0 justify-between sm:justify-end w-full sm:w-auto">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${status.classes}`}>
                      <StatusIcon size={11} aria-hidden="true" />
                      {status.label}
                    </span>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      {fmt(bid.amount)}
                    </p>
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