import { useMemo } from 'react'
import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useCountdown } from '../hooks/useCountdown'

function CountdownTimer({ endsAt, className = '' }) {
  const { timeLeft, isExpired } = useCountdown(endsAt)

  // Fallback protection if the hook initializes with undefined values on the mount tick
  const { days = 0, hours = 0, minutes = 0, seconds = 0 } = timeLeft || {}

  // Standard numerical padding to eliminate layout size shifts
  const pad = (num) => String(num).padStart(2, '0')

  // Memoized Urgency Matrix Style Engine
  const layoutConfig = useMemo(() => {
    if (isExpired) return null

    const isExtremeUrgency = days === 0 && hours === 0 && minutes < 10
    const isWarningUrgency = days === 0 && hours < 1

    if (isExtremeUrgency) {
      return {
        colors: 'text-red-400 bg-red-500/5 border-red-500/10 animate-pulse',
        display: `${pad(minutes)}m : ${pad(seconds)}s`,
        Icon: AlertTriangle,
        iconClass: 'animate-bounce text-red-400'
      }
    }

    if (isWarningUrgency) {
      return {
        colors: 'text-amber-400 bg-amber-500/5 border-amber-500/10',
        display: `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`,
        Icon: Clock,
        iconClass: 'text-amber-400'
      }
    }

    // Default stable track
    return {
      colors: 'text-green-400 bg-green-500/5 border-green-500/10',
      display: days > 0 
        ? `${days}d ${pad(hours)}h ${pad(minutes)}m` 
        : `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`,
      Icon: Clock,
      iconClass: 'text-green-500'
    }
  }, [days, hours, minutes, seconds, isExpired])

  if (isExpired) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-gray-900 border border-gray-800 text-gray-500 rounded-lg shadow-inner ${className}`}>
        <ShieldCheck size={12} className="text-gray-600" />
        Auction Settled
      </span>
    )
  }

  const { colors, display, Icon, iconClass } = layoutConfig

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold tracking-tight font-mono tabular-nums select-none transition-all duration-300 ${colors} ${className}`}>
      <Icon size={12} className={iconClass} />
      {display}
    </span>
  )
}

export default CountdownTimer