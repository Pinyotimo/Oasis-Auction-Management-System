import { useMemo } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Gavel, LogOut, User, PlusCircle, Shield, Store } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Pure data matrix mapping role accent colors and system configurations
  const roleBadgeConfig = useMemo(() => {
    const role = user?.role?.toLowerCase()
    switch (role) {
      case 'admin':
        return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', Icon: Shield }
      case 'seller':
        return { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400', Icon: Store }
      default:
        return { bg: 'bg-gray-800/60 border-gray-700/50 text-gray-400', Icon: User }
    }
  }, [user?.role])

  // Centralized active route styling class utility
  const navLinkClasses = ({ isActive }) =>
    `text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
      isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-100'
    }`

  const RoleIcon = roleBadgeConfig.Icon

  return (
    <nav className="bg-gray-950/80 border-b border-gray-800/80 sticky top-0 z-50 backdrop-blur-md select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* --- BRAND ZONE --- */}
        <Link 
          to="/" 
          className="flex items-center gap-2.5 text-lg font-black tracking-tight text-white group flex-shrink-0"
        >
          <div className="h-9 w-9 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <Gavel size={18} />
          </div>
          <span>
            Smart<span className="text-blue-500">Auction</span>
          </span>
        </Link>
        
        {/* --- GLOBAL APPLICATION NAVIGATION --- */}
        <div className="hidden md:flex items-center gap-6 flex-1 max-w-xs justify-center">
          <NavLink to="/" end className={navLinkClasses}>
            Auctions Exchange
          </NavLink>
        </div>

        {/* --- USER ACCOUNT PORTAL INTERFACES --- */}
        <div className="flex items-center gap-4 sm:gap-5">
          {isAuthenticated ? (
            <>
              {/* Context Action Button: Sell Item */}
              {(user?.role === 'seller' || user?.role === 'admin') && (
                <Link 
                  to="/create" 
                  className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition text-xs font-bold uppercase tracking-wider"
                >
                  <PlusCircle size={14} className="text-blue-500" />
                  <span className="hidden sm:inline">Sell Asset</span>
                </Link>
              )}

              {/* Administrative Node Option */}
              {user?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition"
                >
                  Console
                </Link>
              )}

              <NavLink to="/profile" className={navLinkClasses}>
                Dashboard
              </NavLink>

              <div className="hidden lg:flex items-center gap-2.5 border-l border-gray-800 pl-5">
                <div className="text-right">
                  <p className="text-[11px] font-bold text-gray-300 tracking-tight leading-none max-w-[140px] truncate">
                    {user?.email}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded-md ${roleBadgeConfig.bg}`}>
                  <RoleIcon size={10} />
                  {user?.role}
                </span>
              </div>
              
              <button 
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-gray-500 hover:text-red-400 transition text-xs font-bold uppercase tracking-wider border border-transparent hover:border-red-500/10 hover:bg-red-500/5 px-2.5 py-1.5 rounded-xl"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link 
                to="/login" 
                className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition px-3 py-1.5"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/10"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar