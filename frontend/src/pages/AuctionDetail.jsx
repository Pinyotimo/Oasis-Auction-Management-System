import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, Gavel, User, ArrowLeft, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react'
import { io } from 'socket.io-client'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import api from '../lib/api'
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
      if (isInitialFetch) setError('Unable to retrieve auction metrics.')
    } finally {
      if (isInitialFetch) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAuctionData(true)

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000')
    socket.emit('join_auction', parseInt(id))
    socket.on('bid_placed', () => fetchAuctionData(false))

    return () => { socket.disconnect() }
  }, [id, fetchAuctionData])

  useEffect(() => {
    if (!auction?.ends_at) return
    const calculateTimeRemaining = () => new Date(auction.ends_at) - new Date()
    setMsLeft(calculateTimeRemaining())

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining()
      setMsLeft(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [auction?.ends_at])

  const isEnded = msLeft <= 0
  const isEndingSoon = msLeft > 0 && msLeft < 3600000

  const formatTimeLeft = () => {
    if (isEnded) return 'Auction Settled'
    const days = Math.floor(msLeft / 86400000)
    const hours = Math.floor((msLeft % 86400000) / 3600000)
    const mins = Math.floor((msLeft % 3600000) / 60000)
    const secs = Math.floor((msLeft % 60000) / 1000)
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`
    return `${mins}m ${secs}s`
  }

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0)

  const currentHighestBid = auction?.bids?.[0]?.amount || parseFloat(auction?.reserve_price || 0)
  const minimumRequiredBid = currentHighestBid + (auction?.bids?.length > 0 ? 100 : 0)

  const handleBidSubmit = async (e) => {
    e.preventDefault()
    const parsedBid = parseFloat(bidAmount)

    if (isNaN(parsedBid) || parsedBid < minimumRequiredBid) {
      setUiFeedback({ type: 'error', message: `Bid must meet or exceed ${formatCurrency(minimumRequiredBid)}` })
      return
    }

    try {
      setIsSubmitting(true)
      setUiFeedback({ type: null, message: '' })
      await api.post(`/auctions/${id}/bids`, { amount: parsedBid })
      setBidAmount('')
      setUiFeedback({ type: 'success', message: 'Bid placed successfully!' })
      await fetchAuctionData(false)
    } catch (err) {
      setUiFeedback({ 
        type: 'error', 
        message: err.response?.data?.error || 'Failed to place bid. Please try again.' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-sm text-gray-500 animate-pulse font-medium">Loading auction...</p>
      </div>
    )
  }

  if (error || !auction) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <AlertCircle className="mx-auto text-red-400 mb-4" size={44} />
        <p className="text-gray-200 font-bold text-lg mb-2">{error || 'Auction Not Found'}</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-gray-800 text-gray-300 hover:text-white px-5 py-2.5 rounded-xl border border-gray-700 font-semibold text-sm transition">
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition group">
        <ArrowLeft size={16} className="transform group-hover:-translate-x-0.5 transition-transform" />
        Back to Live Catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Image & Info */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-950/40 relative shadow-2xl">
            <img 
              src={auction.photo_urls?.[0] || 'https://via.placeholder.com/800x500?text=Lot+Image'} 
              alt={auction.title} 
              className={`w-full h-[440px] object-cover ${isEnded ? 'grayscale' : ''}`} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-40 pointer-events-none" />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={isEnded ? 'default' : isEndingSoon ? 'danger' : 'active'} className="uppercase font-bold tracking-wider text-[10px]">
              {isEnded ? 'Settled' : isEndingSoon ? 'Closing' : 'Open'}
            </Badge>
            <span className="text-gray-400 text-sm bg-gray-900/60 border border-gray-800/80 px-3 py-1 rounded-full flex items-center gap-1.5">
              <User size={13} className="text-gray-500" />
              Seller: <span className="text-gray-300 font-medium">{auction.seller_email}</span>
            </span>
          </div>
          
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">{auction.title}</h1>
            <div className="h-px bg-gray-800/80 my-4" />
            <p className="text-gray-300 leading-relaxed text-base whitespace-pre-wrap">{auction.description}</p>
          </div>
        </div>

        {/* RIGHT: Bidding Panel */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 border-gray-800 bg-gray-900/20 backdrop-blur-sm shadow-xl">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-800/60 pb-5 mb-5">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} /> Time Remaining
                </span>
                <p className={`text-base font-bold ${isEndingSoon && !isEnded ? 'text-red-400 animate-pulse' : 'text-gray-200'}`}>
                  {formatTimeLeft()}
                </p>
              </div>
              <div className="space-y-1 border-l border-gray-800/80 pl-4">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Gavel size={13} /> Bids
                </span>
                <p className="text-base font-bold text-gray-200">
                  {auction.bids?.length || 0} {auction.bids?.length === 1 ? 'bid' : 'bids'}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
                {auction.bids?.length > 0 ? 'Current Highest Bid' : 'Starting Price'}
              </p>
              <p className="text-4xl font-black tracking-tight text-green-400">
                {formatCurrency(currentHighestBid)}
              </p>
            </div>

            {uiFeedback.message && (
              <div className={`mb-4 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium ${
                uiFeedback.type === 'error' ? 'bg-red-500/5 border-red-500/10 text-red-400' : 'bg-green-500/5 border-green-500/10 text-green-400'
              }`}>
                {uiFeedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span>{uiFeedback.message}</span>
              </div>
            )}

            {!isEnded ? (
              isAuthenticated ? (
                <form onSubmit={handleBidSubmit} className="space-y-3">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">$</span>
                      <Input 
                        type="number" 
                        step="any"
                        disabled={isSubmitting}
                        placeholder={`Min ${minimumRequiredBid}`}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="pl-7 bg-gray-950/80 border-gray-800 focus:border-blue-500/80 w-full"
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting || !bidAmount} className="px-6 font-bold text-sm min-w-[120px]">
                      {isSubmitting ? 'Securing...' : 'Place Bid'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Minimum bid: <strong className="text-gray-400">{formatCurrency(minimumRequiredBid)}</strong>
                  </p>
                </form>
              ) : (
                <div className="text-center p-4 bg-gray-950/40 rounded-xl border border-gray-800/80">
                  <p className="text-gray-400 text-sm mb-3">Please sign in to place bids.</p>
                  <Link to="/login">
                    <Button variant="outline" className="w-full text-xs font-bold py-2">Sign In</Button>
                  </Link>
                </div>
              )
            ) : (
              <div className="text-center p-4 bg-gray-800/10 rounded-xl border border-gray-800 text-gray-500 text-sm font-semibold">
                This auction has ended.
              </div>
            )}
          </Card>

          {/* Bid History */}
          {auction.bids && auction.bids.length > 0 && (
            <Card className="p-6 border-gray-800 bg-gray-900/10">
              <h3 className="font-bold text-sm text-gray-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <TrendingUp size={16} className="text-blue-400" />
                Bid History
              </h3>
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {auction.bids.map((bid, i) => (
                  <div key={bid.id || i} className="flex items-center justify-between py-2.5 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/10 px-2 rounded-lg transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs text-gray-300 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                        {bid.bidder_email}
                        {i === 0 && <span className="text-[9px] text-blue-400 border border-blue-500/20 bg-blue-500/5 px-1 rounded font-bold uppercase">Highest</span>}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {new Date(bid.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <p className={`font-bold text-sm ${i === 0 ? 'text-green-400 text-base font-black' : 'text-gray-400'}`}>
                      {formatCurrency(bid.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuctionDetail