import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Gavel, ArrowUpRight, Lock } from 'lucide-react'
import { formatKES } from '../lib/currency'

function AuctionCard({ auction }) {
  const calculateMsLeft = () =>
    Math.max(0, new Date(auction.endsAt).getTime() - Date.now())

  const [msLeft, setMsLeft] = useState(calculateMsLeft)
  const previousBid = useRef(auction.currentBid)
  const [highlightBid, setHighlightBid] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setMsLeft(calculateMsLeft()), 1000)
    return () => clearInterval(interval)
  }, [auction.endsAt])

  useEffect(() => {
    if (auction.currentBid > previousBid.current) {
      setHighlightBid(true)
      const t = setTimeout(() => setHighlightBid(false), 1200)
      previousBid.current = auction.currentBid
      return () => clearTimeout(t)
    }
    previousBid.current = auction.currentBid
  }, [auction.currentBid])

  const isEnded = msLeft <= 0
  const isEndingSoon = msLeft > 0 && msLeft < 3600000

  const timeLeftString = useMemo(() => {
    if (isEnded) return 'Auction closed'
    const days = Math.floor(msLeft / 86400000)
    const hours = Math.floor((msLeft % 86400000) / 3600000)
    const mins = Math.floor((msLeft % 3600000) / 60000)
    const secs = Math.floor((msLeft % 60000) / 1000)
    const pad = n => String(n).padStart(2, '0')
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h : ${pad(mins)}m`
    return `${pad(mins)}m : ${pad(secs)}s`
  }, [msLeft, isEnded])

  const fmt = formatKES

  const timerVariant = isEnded
    ? 'bg-secondary text-tertiary border-tertiary'
    : isEndingSoon
    ? 'bg-warning/10 text-warning border-warning/20'
    : 'bg-success/10 text-success border-success/20'

  return (
    <Link
      to={`/auction/${auction.id}`}
      onClick={e => isEnded && e.preventDefault()}
      className={`block group h-full ${isEnded ? 'cursor-not-allowed' : ''}`}
    >
      <div
        className={`h-full flex flex-col bg-white dark:bg-gray-900 border rounded-xl overflow-hidden transition-colors duration-150 ${
          isEnded
            ? 'opacity-55 border-gray-200 dark:border-gray-800'
            : 'border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500'
        }`}
      >
        {/* Image */}
        <div className="relative h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
          <img
            src={auction.image || 'https://via.placeholder.com/400x240?text=No+Image'}
            alt={auction.title}
            loading="lazy"
            onError={e => { e.target.src = 'https://via.placeholder.com/400x240?text=No+Image' }}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              !isEnded ? 'group-hover:scale-[1.04]' : 'grayscale'
            }`}
          />

          {/* Timer badge */}
          <span
            className={`absolute top-2.5 right-2.5 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border backdrop-blur-sm tabular-nums ${timerVariant} ${
              isEndingSoon && !isEnded ? 'animate-pulse' : ''
            }`}
          >
            {isEnded ? <Lock size={11} /> : <Clock size={11} />}
            {timeLeftString}
          </span>

          {/* Hover CTA */}
          {!isEnded && (
            <div className="absolute bottom-2.5 right-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200">
              <ArrowUpRight size={14} />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Category pill */}
          {auction.category && (
            <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 mb-2 w-fit">
              {auction.category}
            </span>
          )}

          <h3
            className={`font-medium text-[13px] leading-snug truncate mb-1 transition-colors ${
              isEnded
                ? 'text-gray-400'
                : 'text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
            }`}
          >
            {auction.title}
          </h3>

          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-auto">
            {auction.description}
          </p>

          {/* Footer */}
          <div className="flex items-end justify-between border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">
                {auction.bidCount > 0 ? 'Current bid' : 'Starting bid'}
              </p>
              <p
                className={`text-[18px] font-medium transition-colors duration-300 ${
                  isEnded
                    ? 'text-gray-400 line-through'
                    : highlightBid
                    ? 'text-amber-500'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {fmt(auction.currentBid)}
              </p>
            </div>

            <div
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border ${
                auction.bidCount > 0 && !isEnded
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                  : 'text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <Gavel size={12} />
              {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default AuctionCard