function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-gray-800 text-gray-300 border-gray-700',
    success: 'bg-green-900/50 text-green-400 border-green-800',
    warning: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
    danger: 'bg-red-900/50 text-red-400 border-red-800',
    info: 'bg-blue-900/50 text-blue-400 border-blue-800',
    active: 'bg-green-900/50 text-green-400 border-green-800'
  }
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  )
}

export default Badge