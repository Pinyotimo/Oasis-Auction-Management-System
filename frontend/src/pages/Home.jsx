import { useState, useEffect, useCallback, useMemo } from 'react'
import { io } from 'socket.io-client'
import { Search, SlidersHorizontal, Flame, Sparkles, HelpCircle, Wifi, WifiOff } from 'lucide-react'
import AuctionCard from '../components/AuctionCard'
import Input from '../components/ui/Input'
import api from '../lib/api'
import { formatKES } from '../lib/currency'

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000'
const PAGE_SIZE = 12
const ONE_DAY_MS = 86400000

const FILTER_TABS = [
  { id: 'all', label: 'All catalog' },
  { id: 'active', label: 'Live' },
  { id: 'ending-soon', label: 'Ending soon' },
]

function Home() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const [now, setNow] = useState(Date.now())

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)

  // Live clock — updates every minute for isActive/isEndingSoon flags
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch auctions
  const fetchAuctionsData = useCallback(async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) setLoading(true)
      const response = await api.get('/auctions')
      setAuctions(response.data || [])
      setError(null)
    } catch (err) {
      console.error('Catalog sync error:', err)
      if (isInitialFetch) setError('Unable to load auction catalog.')
    } finally {
      if (isInitialFetch) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuctionsData(true)
  }, [])

  // WebSocket realtime updates
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => setSocketConnected(true))
    socket.on('disconnect', () => setSocketConnected(false))
    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err)
      setSocketConnected(false)
    })
    socket.on('reconnect_failed', () => {
      console.error('Socket reconnect failed')
      setSocketConnected(false)
    })

    socket.on('bid_placed', updatedAuction => {
      setAuctions(prev =>
        prev.map(a => a.id === updatedAuction.id ? { ...a, ...updatedAuction } : a)
      )
    })

    socket.on('auction_refresh', () => fetchAuctionsData(false))

    return () => socket.disconnect()
  }, [fetchAuctionsData])

  // Derived auction data with time flags
  const enhancedAuctions = useMemo(() => {
    return auctions.map(auction => {
      const endsAtMs = new Date(auction.ends_at).getTime()
      const msLeft = endsAtMs - now
      return {
        ...auction,
        isActive: msLeft > 0,
        isEndingSoon: msLeft > 0 && msLeft < ONE_DAY_MS,
      }
    })
  }, [auctions, now])

  // Filter + sort
  const processedAuctions = useMemo(() => {
    let result = [...enhancedAuctions]

    if (debouncedSearch) {
      result = result.filter(a =>
        a.title?.toLowerCase().includes(debouncedSearch) ||
        a.description?.toLowerCase().includes(debouncedSearch)
      )
    }

    if (filterTab === 'active') result = result.filter(a => a.isActive)
    if (filterTab === 'ending-soon') result = result.filter(a => a.isEndingSoon)

    result.sort((a, b) => {
      if (sortBy === 'bidCount') return (b.bid_count || 0) - (a.bid_count || 0)
      if (sortBy === 'value') {
        return parseFloat(b.current_price || b.reserve_price || 0) -
               parseFloat(a.current_price || a.reserve_price || 0)
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

    return result
  }, [enhancedAuctions, debouncedSearch, filterTab, sortBy])

  const paginatedAuctions = useMemo(
    () => processedAuctions.slice(0, page * PAGE_SIZE),
    [processedAuctions, page]
  )

  const hasMore = paginatedAuctions.length < processedAuctions.length

  // Derived stats
  const totalActive = useMemo(() => enhancedAuctions.filter(a => a.isActive).length, [enhancedAuctions])
  const totalEndingSoon = useMemo(() => enhancedAuctions.filter(a => a.isEndingSoon).length, [enhancedAuctions])
  const totalBids = useMemo(() => enhancedAuctions.reduce((sum, a) => sum + (a.bid_count || 0), 0), [enhancedAuctions])
  const avgBid = useMemo(() => {
    const priced = enhancedAuctions.filter(a => a.current_price || a.reserve_price)
    if (!priced.length) return 0
    return priced.reduce((sum, a) => sum + parseFloat(a.current_price || a.reserve_price || 0), 0) / priced.length
  }, [enhancedAuctions])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium animate-pulse">
          Opening trading floor catalog...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-32 max-w-sm mx-auto space-y-4">
        <p className="text-red-500 font-medium text-sm">{error}</p>
        <button
          onClick={() => fetchAuctionsData(true)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs uppercase tracking-wider py-2.5 rounded-xl transition"
        >
          Re-establish connection
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 sm:p-12">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-blue-400 hidden lg:block">
          <Sparkles size={160} />
        </div>

        <div className="max-w-2xl space-y-4 relative z-10">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full text-[11px] font-medium text-blue-600 dark:text-blue-400">
            <Flame size={11} className="animate-pulse" aria-hidden="true" />
            Live trading floor
          </span>

          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white tracking-tight leading-none">
            Acquire extraordinary items in{' '}
            <span className="text-blue-600 dark:text-blue-400">real&#8209;time</span>
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xl">
            Transparent micro-bidding mechanics backed by decentralized verification logs.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active auctions', value: totalActive, sub: `of ${enhancedAuctions.length} total` },
          { label: 'Total bids placed', value: totalBids.toLocaleString(), sub: 'all time' },
          { label: 'Ending soon', value: totalEndingSoon, sub: 'within 24 hours' },
          { label: 'Avg. bid value', value: formatKES(Math.round(avgBid)), sub: 'current listings' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-medium text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search assets, lots, or vendors..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
            className="pl-9 w-full text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter tabs */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 gap-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setFilterTab(tab.id); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterTab === tab.id
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-2 rounded-xl">
            <SlidersHorizontal size={12} className="text-gray-400" aria-hidden="true" />
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1) }}
              className="bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
              aria-label="Sort auctions"
            >
              <option value="newest">Newest</option>
              <option value="bidCount">High action</option>
              <option value="value">Valuation</option>
            </select>
          </div>

          {/* Socket status */}
          <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-2 rounded-xl border ${
            socketConnected
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
              : 'text-gray-400 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
          }`}>
            {socketConnected
              ? <Wifi size={12} aria-hidden="true" />
              : <WifiOff size={12} aria-hidden="true" />
            }
            {socketConnected ? 'Live' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Grid */}
      {paginatedAuctions.length === 0 ? (
        <div className="text-center py-20 max-w-sm mx-auto space-y-2">
          <HelpCircle className="mx-auto text-gray-300 dark:text-gray-700" size={28} aria-hidden="true" />
          <p className="text-gray-500 font-medium text-sm">No auctions found</p>
          <p className="text-gray-400 text-xs">Try changing your filters or search terms.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paginatedAuctions.map(auction => (
              <AuctionCard
                key={auction.id}
                auction={{
                  id: auction.id,
                  title: auction.title,
                  description: auction.description,
                  category: auction.category,
                  currentBid: parseFloat(auction.current_price || auction.reserve_price || 0),
                  bidCount: auction.bid_count || 0,
                  endsAt: auction.ends_at,
                  image: auction.photo_urls?.[0],
                  status: auction.status,
                }}
              />
            ))}
          </div>

          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={() => setPage(prev => prev + 1)}
                className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition border border-gray-200 dark:border-gray-700"
              >
                Load more ({processedAuctions.length - paginatedAuctions.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Home