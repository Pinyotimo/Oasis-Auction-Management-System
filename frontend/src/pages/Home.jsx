import { useState, useEffect, useCallback, useMemo } from 'react'
import { io } from 'socket.io-client'
import {
  Search,
  SlidersHorizontal,
  Flame,
  Sparkles,
  HelpCircle,
  Wifi,
  WifiOff
} from 'lucide-react'

import AuctionCard from '../components/AuctionCard'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import api from '../lib/api'

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000'

const PAGE_SIZE = 12
const ONE_DAY_MS = 86400000

const FILTER_TABS = [
  { id: 'all', label: 'All Catalog' },
  { id: 'active', label: 'Live' },
  { id: 'ending-soon', label: 'Ending Soon' }
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

  // Live clock update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase())
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch auctions
  const fetchAuctionsData = useCallback(async (isInitialFetch = false) => {
    const controller = new AbortController()

    try {
      if (isInitialFetch) {
        setLoading(true)
      }

      const response = await api.get('/auctions', {
        signal: controller.signal
      })

      setAuctions(response.data || [])
      setError(null)
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('Catalog sync error:', err)

        if (isInitialFetch) {
          setError('Unable to load auction catalog.')
        }
      }
    } finally {
      if (isInitialFetch) {
        setLoading(false)
      }
    }

    return () => controller.abort()
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchAuctionsData(true)
  }, [])

  // WebSocket realtime updates
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socket.on('connect', () => {
      setSocketConnected(true)
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
    })

    // Server should emit updated auction object
    socket.on('bid_placed', updatedAuction => {
      setAuctions(prev =>
        prev.map(auction =>
          auction.id === updatedAuction.id
            ? {
                ...auction,
                ...updatedAuction
              }
            : auction
        )
      )
    })

    // Optional fallback refresh event
    socket.on('auction_refresh', () => {
      fetchAuctionsData(false)
    })

    return () => {
      socket.disconnect()
    }
  }, [fetchAuctionsData])

  // Enhanced auctions
  const enhancedAuctions = useMemo(() => {
    return auctions.map(auction => {
      const endsAtMs = new Date(auction.ends_at).getTime()
      const msLeft = endsAtMs - now

      return {
        ...auction,
        isActive: msLeft > 0,
        isEndingSoon: msLeft > 0 && msLeft < ONE_DAY_MS
      }
    })
  }, [auctions, now])

  // Filter + sort
  const processedAuctions = useMemo(() => {
    let result = [...enhancedAuctions]

    // Search
    if (debouncedSearch) {
      result = result.filter(
        auction =>
          auction.title?.toLowerCase().includes(debouncedSearch) ||
          auction.description?.toLowerCase().includes(debouncedSearch)
      )
    }

    // Filters
    if (filterTab === 'active') {
      result = result.filter(auction => auction.isActive)
    }

    if (filterTab === 'ending-soon') {
      result = result.filter(auction => auction.isEndingSoon)
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'bidCount':
          return (b.bid_count || 0) - (a.bid_count || 0)

        case 'value': {
          const valueA = parseFloat(
            a.current_price || a.reserve_price || 0
          )

          const valueB = parseFloat(
            b.current_price || b.reserve_price || 0
          )

          return valueB - valueA
        }

        case 'newest':
        default:
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          )
      }
    })

    return result
  }, [enhancedAuctions, debouncedSearch, filterTab, sortBy])

  // Pagination
  const paginatedAuctions = useMemo(() => {
    return processedAuctions.slice(0, page * PAGE_SIZE)
  }, [processedAuctions, page])

  const hasMore =
    paginatedAuctions.length < processedAuctions.length

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />

        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold animate-pulse">
          Opening trading floor catalog...
        </p>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="text-center py-32 max-w-sm mx-auto space-y-4">
        <p className="text-red-400 font-bold text-sm leading-relaxed">
          {error}
        </p>

        <button
          onClick={() => fetchAuctionsData(true)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition shadow-lg shadow-blue-600/10"
        >
          Re-establish Connection
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden border border-gray-800/80 bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950/20 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-blue-400 hidden lg:block">
          <Sparkles size={180} />
        </div>

        <div className="max-w-2xl space-y-4 relative z-10">
          <span className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-wider">
            <Flame size={12} className="animate-pulse" />
            Live Liquid Trading Floor
          </span>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
            Acquire Extraordinary Items In{' '}
            <span className="text-blue-400">
              Real-Time
            </span>
          </h1>

          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-xl font-medium">
            Transparent micro-bidding mechanics backed by
            decentralized verification logs.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-900/30 border border-gray-800/60 p-4 rounded-2xl backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            size={14}
          />

          <Input
            type="text"
            placeholder="Search assets, lots, or vendors..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="pl-10 bg-gray-950 border-gray-800/80 focus:border-blue-500/80 w-full rounded-xl text-xs placeholder-gray-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tabs */}
          <div className="bg-gray-950 p-1 rounded-xl border border-gray-800 flex items-center">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                aria-pressed={filterTab === tab.id}
                onClick={() => {
                  setFilterTab(tab.id)
                  setPage(1)
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl">
            <SlidersHorizontal
              size={12}
              className="text-gray-500"
            />

            <select
              aria-label="Sort auctions"
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value)
                setPage(1)
              }}
              className="bg-transparent text-xs font-bold text-gray-300 focus:outline-none cursor-pointer pr-2 appearance-none"
            >
              <option value="newest" className="bg-gray-950">
                Sort: Newest
              </option>

              <option value="bidCount" className="bg-gray-950">
                Sort: High Action
              </option>

              <option value="value" className="bg-gray-950">
                Sort: Valuation
              </option>
            </select>
          </div>

          {/* Connection */}
          <div
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
              socketConnected
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {socketConnected ? (
              <Wifi size={12} />
            ) : (
              <WifiOff size={12} />
            )}

            {socketConnected ? 'Live' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Empty */}
      {paginatedAuctions.length === 0 ? (
        <Card className="border-dashed border-gray-800 p-16 text-center max-w-lg mx-auto bg-transparent">
          <HelpCircle
            className="mx-auto text-gray-700 mb-3"
            size={28}
          />

          <p className="text-gray-400 font-bold text-sm">
            No Auctions Found
          </p>

          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Try changing your filters or search terms.
          </p>
        </Card>
      ) : (
        <>
          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAuctions.map(auction => (
              <AuctionCard
                key={auction.id}
                auction={{
                  id: auction.id,
                  title: auction.title,
                  description: auction.description,
                  currentBid: parseFloat(
                    auction.current_price ||
                      auction.reserve_price ||
                      0
                  ),
                  bidCount: auction.bid_count || 0,
                  endsAt: auction.ends_at,
                  image: auction.photo_urls?.[0],
                  status: auction.status
                }}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => setPage(prev => prev + 1)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition border border-gray-700"
              >
                Load More (
                {processedAuctions.length -
                  paginatedAuctions.length}{' '}
                remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Home