import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, Gavel, User, ArrowLeft, AlertCircle, CheckCircle2, TrendingUp, Lock } from 'lucide-react'
import { io } from 'socket.io-client'
import Input from '../components/ui/Input'
import api from '../lib/api'
import { formatKES } from '../lib/currency'
import { useAuthStore } from '../store/authStore'

function AuctionDetail() {
  const { id } = useParams()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bidAmount, setBidAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uiFeedback, setUiFeedback] = useState({ type: null, message: '' })
  const [msLeft, setMsLeft] = useState(0)

  const fetchAuctionData = useCallback(async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) setLoading(true)
      const response = await api.get(`/auctions/${id}`)
      setAuction(response.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching auction:', err)
      if (isInitialFetch) setError('Unable to retrieve auction details.')
    } finally {
      if (isInitialFetch) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAuctionData(true)

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000')
    socket.emit('join_auction', parseInt(id))
    socket.on('bid_placed', () => fetchAuctionData(false))
    socket.on('auction_refresh', () => fetchAuctionData(false))

    return () => socket.disconnect()
  }, [id, fetchAuctionData])

  useEffect(() => {
    if (!auction?.ends_at) return
    const calc = () => new Date(auction.ends_at) - new Date()
    setMsLeft(calc())
    const interval = setInterval(() => {
      const remaining = calc()
      setMsLeft(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [auction?.ends_at])

  const isEnded = msLeft <= 0
  const isEndingSoon = msLeft > 0 && msLeft < 3600000

  const formatTimeLeft = () => {
    if (isEnded) return 'Auction settled'
    const days = Math.floor(msLeft / 86400000)
    const hours = Math.floor((msLeft % 86400000) / 3600000)
    const mins = Math.floor((msLeft % 3600000) / 60000)
    const secs = Math.floor((msLeft % 60000) / 1000)
    const pad = n => String(n).padStart(2, '0')
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${pad(mins)}m ${pad(secs)}s`
    return `${pad(mins)}m : ${pad(secs)}s`
  }

  const fmt = formatKES

  const currentHighestBid = auction?.bids?.[0]?.amount || parseFloat(auction?.reserve_price || 0)
  const minimumRequiredBid = currentHighestBid + (auction?.bids?.length > 0 ? 100 : 0)

  const handleBidSubmit = async (e) => {
    e.preventDefault()
    const parsedBid = parseFloat(bidAmount)
    if (isNaN(parsedBid) || parsedBid < minimumRequiredBid) {
      setUiFeedback({ type: 'error', message: `Bid must meet or exceed ${fmt(minimumRequiredBid)}` })
      return
    }
    try {
      setIsSubmitting(true)
      setUiFeedback({ type: null, message: '' })
      await api.post(`/auctions/${id}/bids`, { amount: parsedBid })
      setBidAmount('')
      setUiFeedback({ type: 'success', message: 'Bid placed successfully.' })
      await fetchAuctionData(false)
    } catch (err) {
      setUiFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to place bid. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium animate-pulse">
          Loading auction...
        </p>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────
  if (error || !auction) {
    return (
      <div className="text-center py-24 max-w-sm mx-auto space-y-4">
        <AlertCircle className="mx-auto text-red-400" size={36} />
        <p className="text-gray-800 dark:text-gray-200 font-medium text-base">
          {error || 'Auction not found'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
        >
          <ArrowLeft size={15} /> Back to catalog
        </Link>
      </div>
    )
  }

  // ── Main ─────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group"
      >
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── LEFT: Image + Details ── */}
        <div className="lg:col-span-7 space-y-5">

          {/* Image */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
            <img
              src={auction.photo_urls?.[0] || 'https://via.placeholder.com/800x500?text=Lot+Image'}
              alt={auction.title}
              className={`w-full h-[420px] object-cover ${isEnded ? 'grayscale opacity-75' : ''}`}
            />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
              isEnded
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'
                : isEndingSoon
                ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 animate-pulse'
                : 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
            }`}>
              {isEnded ? <Lock size={11} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              {isEnded ? 'Settled' : isEndingSoon ? 'Closing soon' : 'Live'}
            </span>

            {auction.category && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700">
                {auction.category}
              </span>
            )}

            <span className="text-[11px] text-gray-400 flex items-center gap-1.5 ml-auto">
              <User size={12} aria-hidden="true" />
              {auction.seller_email}
            </span>
          </div>

          {/* Title + description */}
          <div>
            <h1 className="text-3xl font-medium text-gray-900 dark:text-white tracking-tight leading-snug">
              {auction.title}
            </h1>
            <div className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm whitespace-pre-wrap">
              {auction.description}
            </p>
          </div>
        </div>

        {/* ── RIGHT: Bid Panel ── */}
        <div className="lg:col-span-5 space-y-4">

          {/* Main bid card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5">

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3.5">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Clock size={11} aria-hidden="true" /> Time remaining
                </p>
                <p className={`text-sm font-medium tabular-nums ${
                  isEnded
                    ? 'text-gray-400'
                    : isEndingSoon
                    ? 'text-amber-500 animate-pulse'
                    : 'text-gray-800 dark:text-gray-100'
                }`}>
                  {formatTimeLeft()}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3.5">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Gavel size={11} aria-hidden="true" /> Bids placed
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {auction.bids?.length || 0} {auction.bids?.length === 1 ? 'bid' : 'bids'}
                </p>
              </div>
            </div>

            {/* Current bid */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                {auction.bids?.length > 0 ? 'Current highest bid' : 'Starting price'}
              </p>
              <p className="text-4xl font-medium text-green-600 dark:text-green-400 tracking-tight">
                {fmt(currentHighestBid)}
              </p>
            </div>

            {/* Feedback */}
            {uiFeedback.message && (
              <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs font-medium ${
                uiFeedback.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                  : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
              }`}>
                {uiFeedback.type === 'error'
                  ? <AlertCircle size={15} className="flex-shrink-0 mt-px" />
                  : <CheckCircle2 size={15} className="flex-shrink-0 mt-px" />
                }
                {uiFeedback.message}
              </div>
            )}

            {/* Bid form / CTA */}
            {!isEnded ? (
              isAuthenticated ? (
                <form onSubmit={handleBidSubmit} className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                        KES
                      </span>
                      <Input
                        type="number"
                        step="any"
                        disabled={isSubmitting}
                        placeholder={fmt(minimumRequiredBid)}
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        className="pl-7 w-full text-sm rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !bidAmount}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition whitespace-nowrap"
                    >
                      {isSubmitting ? 'Placing...' : 'Place bid'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Minimum bid: <span className="text-gray-600 dark:text-gray-300 font-medium">{fmt(minimumRequiredBid)}</span>
                  </p>
                </form>
              ) : (
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                  <p className="text-gray-500 text-sm">Sign in to place bids</p>
                  <Link
                    to="/login"
                    className="block w-full py-2 text-sm font-medium text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 transition"
                  >
                    Sign in
                  </Link>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 text-sm">
                <Lock size={14} aria-hidden="true" />
                This auction has ended
              </div>
            )}
          </div>

          {/* Bid history */}
          {auction.bids?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-blue-500" aria-hidden="true" />
                Bid history
              </h2>

              <div className="space-y-1 max-h-72 overflow-y-auto">
                {auction.bids.map((bid, i) => (
                  <div
                    key={bid.id || i}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 flex-shrink-0 rounded-full ${
                          i === 0 ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'
                        }`} />
                        {bid.bidder_email}
                        {i === 0 && (
                          <span className="text-[9px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            Highest
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400 pl-3">
                        {new Date(bid.created_at).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>

                    <p className={`text-sm font-medium flex-shrink-0 ml-4 ${
                      i === 0
                        ? 'text-green-600 dark:text-green-400 text-base'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {fmt(bid.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuctionDetail