import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Gavel, ArrowUpRight, Lock } from 'lucide-react'
import Card from './ui/Card'
import Badge from './ui/Badge'

function AuctionCard({ auction }) {
  // Safe abstraction to calculate immediate delta bounds
  const calculateMsLeft = useMemo(() => {
    return () => Math.max(0, new Date(auction.endsAt).getTime() - Date.now())
  }, [auction.endsAt])

  const [msLeft, setMsLeft] = useState(calculateMsLeft)

  useEffect(() => {
    if (msLeft <= 0) return

    // Establishes a singular continuous worker interval thread
    const timer = setInterval(() => {
      const remaining = calculateMsLeft()
      setMsLeft(remaining)
      
      if (remaining <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [calculateMsLeft]) // Fixed: Removed msLeft to stop recreating the interval loop every single second

  const isEnded = msLeft <= 0
  const isEndingSoon = msLeft > 0 && msLeft < 3600000 // Less than 1 hour

  // Memoized time string compiler with structural zero-padding to eliminate layout shifting
  const timeLeftString = useMemo(() => {
    if (isEnded) return 'Auction Closed'
    
    const days = Math.floor(msLeft / 86400000)
    const hours = Math.floor((msLeft % 86400000) / 3600000)
    const mins = Math.floor((msLeft % 3600000) / 60000)
    const secs = Math.floor((msLeft % 60000) / 1000)

    const pad = (num) => String(num).padStart(2, '0')

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h : ${pad(mins)}m`
    return `${pad(mins)}m : ${pad(secs)}s`
  }, [msLeft, isEnded])

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    }).format(amount || 0)

  const bidLabel = auction.bidCount > 0 ? 'Current Bid' : 'Starting Bid'

  return (
    <Link 
      to={`/auction/${auction.id}`}
      onClick={(e) => isEnded && e.preventDefault()} 
      className={`block group h-full transition-all duration-300 ${
        isEnded ? 'cursor-not-allowed opacity-50 select-none' : ''
      }`}
    >
      <Card className={`h-full flex flex-col justify-between overflow-hidden border-gray-800 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 ${
        !isEnded ? 'hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5' : 'bg-gray-950/20'
      }`}>
        
        {/* CARD HERO THUMBNAIL AREA */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-950 flex-shrink-0">
          <img 
            src={auction.image || 'https://via.placeholder.com/400x300?text=No+Image'} 
            alt={auction.title}
            className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
              !isEnded ? 'group-hover:scale-105' : 'grayscale contrast-75'
            }`}
            loading="lazy"
          />

          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-gray-950/60 to-transparent pointer-events-none" />

          {/* REALTIME BADGE OVERLAY */}
          <div className="absolute top-3 right-3 z-10 font-mono tabular-nums tracking-tight">
            <Badge 
              variant={isEnded ? 'default' : isEndingSoon ? 'danger' : 'active'}
              className={`backdrop-blur-md shadow-md py-1 px-2.5 text-[11px] font-bold uppercase transition-all ${
                isEndingSoon && !isEnded ? 'animate-pulse' : ''
              }`}
            >
              <span className="flex items-center gap-1.5">
                {isEnded ? <Lock size={12} className="text-gray-500" /> : <Clock size={12} />}
                {timeLeftString}
              </span>
            </Badge>
          </div>

          {!isEnded && (
            <div className="absolute bottom-3 right-3 bg-blue-600 p-2 rounded-xl text-white opacity-0 scale-75 translate-y-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg shadow-blue-600/30">
              <ArrowUpRight size={16} />
            </div>
          )}
        </div>
        
        {/* CARD DESCRIPTION DETAILS BODY */}
        <div className="p-5 flex flex-col flex-grow justify-between">
          <div>
            <h3 className={`font-bold text-lg text-gray-100 line-clamp-1 transition-colors duration-200 ${
              !isEnded ? 'group-hover:text-blue-400' : 'text-gray-400'
            }`}>
              {auction.title}
            </h3>
            <p className="text-gray-400 text-sm mt-1.5 mb-5 line-clamp-2 leading-relaxed font-normal">
              {auction.description}
            </p>
          </div>
          
          {/* FINANCIAL MATRIX ROW */}
          <div className="flex items-end justify-between pt-3.5 border-t border-gray-800/80">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {bidLabel}
              </p>
              <p className={`text-2xl font-black mt-0.5 tracking-tight ${
                isEnded ? 'text-gray-500 line-through font-bold' : 'text-green-400'
              }`}>
                {formatCurrency(auction.currentBid)}
              </p>
            </div>

            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition border ${
              isEnded 
                ? 'text-gray-500 border-transparent bg-gray-800/20' 
                : auction.bidCount > 0 
                ? 'text-blue-400 border-blue-500/10 bg-blue-500/5' 
                : 'text-gray-400 border-gray-800 bg-gray-800/40'
            }`}>
              <Gavel size={13} />
              <span>{auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}</span>
            </div>
          </div>
        </div>

      </Card>
    </Link>
  )
}

export default AuctionCard