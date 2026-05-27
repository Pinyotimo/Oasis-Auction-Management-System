import { useState, useEffect, useCallback, useMemo } from 'react'
import { io } from 'socket.io-client'
import { Search, SlidersHorizontal, Flame, Sparkles, HelpCircle } from 'lucide-react'
import AuctionCard from '../components/AuctionCard'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import api from '../lib/api'

// Centralize connection instance outside the component render cycle to prevent connection leaks
const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000'

function Home() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // UX Controls for Discovery
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState('all') 
  const [sortBy, setSortBy] = useState('newest') 

  // Core fallback sync function
  const fetchAuctionsData = useCallback(async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) setLoading(true)
      const response = await api.get('/auctions')
      setAuctions(response.data || [])
      setError(null)
    } catch (err) {
      console.error('Catalog synchronization breakdown:', err)
      if (isInitialFetch) setError('Unable to align current auction catalog streams.')
    } finally {
      if (isInitialFetch) setLoading(false)
    }
  }, [])

  // --- ARCHITECTURAL FIX: WEBSOCKET TRANSACTION HANDLING ---
  useEffect(() => {
    fetchAuctionsData(true)

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true
    })
    
    // Instead of executing an entire HTTP cycle on every single bid broadcast,
    // we capture the patch data and modify the component state locally.
    socket.on('auction_updated', (updatedAuction) => {
      if (!updatedAuction || !updatedAuction.id) return
      
      setAuctions((prevAuctions) => 
        prevAuctions.map((item) => 
          item.id === updatedAuction.id ? { ...item, ...updatedAuction } : item
        )
      )
    })

    return () => {
      socket.off('auction_updated')
      socket.disconnect()
    }
  }, [fetchAuctionsData])

  // --- ADVANCED SEARCH, FILTER, AND SORT MATRIX ---
  const processedAuctions = useMemo(() => {
    let result = [...auctions]
    const cleanedQuery = searchQuery.trim().toLowerCase()

    // 1. Text Query Filter
    if (cleanedQuery) {
      result = result.filter(
        a => a.title?.toLowerCase().includes(cleanedQuery) || 
             a.description?.toLowerCase().includes(cleanedQuery)
      )
    }

    // 2. Status Tab Filter (Using Date.now() snapshot to guarantee pure functional consistency)
    const currentTimestamp = Date.now()
    const ONE_DAY_MS = 86400000

    if (filterTab === 'ending-soon') {
      result = result.filter(a => {
        const msLeft = new Date(a.ends_at).getTime() - currentTimestamp
        return msLeft > 0 && msLeft < ONE_DAY_MS
      })
    } else if (filterTab === 'active') {
      result = result.filter(a => new Date(a.ends_at).getTime() - currentTimestamp > 0)
    }

    // 3. Sorting Engine Calculations
    result.sort((a, b) => {
      switch (sortBy) {
        case 'bidCount':
          return (b.bid_count || 0) - (a.bid_count || 0)
          
        case 'value': {
          const valA = parseFloat(a.highest_bid || a.reserve_price || 0)
          const valB = parseFloat(b.highest_bid || b.reserve_price || 0)
          return valB - valA
        }
        
        case 'newest':
        default:
          return new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime()
      }
    })

    return result
  }, [auctions, searchQuery, filterTab, sortBy])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold animate-pulse">Opening trading floor catalog...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-32 max-w-sm mx-auto space-y-4">
        <p className="text-red-400 font-bold text-sm leading-relaxed">{error}</p>
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
      
      {/* HERO SPOTLIGHT AREA */}
      <div className="relative rounded-3xl overflow-hidden border border-gray-800/80 bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950/20 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-blue-400 hidden lg:block">
          <Sparkles size={180} />
        </div>
        <div className="max-w-2xl space-y-4 relative z-10">
          <span className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-wider">
            <Flame size={12} className="animate-pulse" /> Live Liquid Trading Floor
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
            Acquire Extraordinary Items In <span className="text-blue-400">Real-Time</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-xl font-medium">
            Transparent micro-bidding mechanics backed by decentralized verification logs. Place your entry bids down to the closing seconds.
          </p>
        </div>
      </div>

      {/* DISCOVERY CONTROL PANEL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-900/30 border border-gray-800/60 p-4 rounded-2xl backdrop-blur-sm">
        
        {/* Search Field Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <Input 
            type="text" 
            placeholder="Search assets, lots, or vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-950 border-gray-800/80 focus:border-blue-500/80 w-full rounded-xl text-xs placeholder-gray-600"
          />
        </div>

        {/* Tab Filtration & Metric Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="bg-gray-950 p-1 rounded-xl border border-gray-800 flex items-center">
            {[
              { id: 'all', label: 'All Catalog' },
              { id: 'active', label: 'Live' },
              { id: 'ending-soon', label: 'Ending Soon' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
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

          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl">
            <SlidersHorizontal size={12} className="text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-300 focus:outline-none cursor-pointer pr-2 appearance-none"
            >
              <option value="newest" className="bg-gray-950">Sort: Newest</option>
              <option value="bidCount" className="bg-gray-950">Sort: High Action</option>
              <option value="value" className="bg-gray-950">Sort: Valuation</option>
            </select>
          </div>

        </div>
      </div>

      {/* BIDDING CATALOG TILES GRID */}
      {processedAuctions.length === 0 ? (
        <Card className="border-dashed border-gray-800 p-16 text-center max-w-lg mx-auto bg-transparent">
          <HelpCircle className="mx-auto text-gray-700 mb-3" size={28} />
          <p className="text-gray-400 font-bold text-sm">No Assets Matches Filters</p>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Adjust your evaluation matrix parameters or clear your text fields to refresh available catalog positions.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedAuctions.map(auction => (
            <AuctionCard 
              key={auction.id} 
              auction={{
                id: auction.id,
                title: auction.title,
                description: auction.description,
                currentBid: parseFloat(auction.highest_bid || auction.reserve_price || 0),
                bidCount: auction.bid_count || 0,
                endsAt: auction.ends_at,
                image: auction.photo_urls?.[0] || auction.image,
                status: auction.status
              }} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Home