import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Gavel,
  LogOut,
  User,
  PlusCircle,
  Shield,
  Store,
} from 'lucide-react'

import { useAuthStore } from '../store/authStore'

const ROLE_CONFIG = {
  admin: {
    icon: Shield,
    styles:
      'bg-amber-500/10 border-amber-500/20 text-amber-400',
  },
  seller: {
    icon: Store,
    styles:
      'bg-purple-500/10 border-purple-500/20 text-purple-400',
  },
  user: {
    icon: User,
    styles:
      'bg-gray-800/60 border-gray-700/50 text-gray-400',
  },
}

function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const role = user?.role?.toLowerCase() || 'user'
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.user
  const RoleIcon = roleConfig.icon

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinkClasses = ({ isActive }) =>
    `
      relative text-xs font-bold uppercase tracking-wider transition-colors duration-200
      ${
        isActive
          ? 'text-blue-400'
          : 'text-gray-400 hover:text-white'
      }
    `

  const actionButton =
    'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition'

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* BRAND */}
        <Link
          to="/"
          className="group flex flex-shrink-0 items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/10 text-blue-400 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white">
            <Gavel size={18} />
          </div>

          <div className="leading-none">
            <p className="text-lg font-black tracking-tight text-white">
              Smart
              <span className="text-blue-500">Auction</span>
            </p>

            <p className="hidden text-[10px] uppercase tracking-[0.25em] text-gray-500 sm:block">
              Marketplace
            </p>
          </div>
        </Link>

        {/* NAVIGATION */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/" end className={navLinkClasses}>
            Auctions
          </NavLink>

          {isAuthenticated && (
            <NavLink to="/profile" className={navLinkClasses}>
              Dashboard
            </NavLink>
          )}

          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navLinkClasses}>
              Admin
            </NavLink>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated ? (
            <>
              {/* CREATE */}
              {(role === 'seller' || role === 'admin') && (
                <Link
                  to="/create"
                  className={`${actionButton} rounded-xl px-3 py-2 text-gray-300 hover:bg-blue-500/10 hover:text-white`}
                >
                  <PlusCircle
                    size={15}
                    className="text-blue-500"
                  />

                  <span className="hidden sm:inline">
                    Sell Item
                  </span>
                </Link>
              )}

              {/* USER INFO */}
              <div className="hidden items-center gap-3 border-l border-gray-800 pl-4 lg:flex">
                <div className="max-w-[160px] text-right">
                  <p className="truncate text-xs font-semibold text-gray-200">
                    {user?.email}
                  </p>

                  <p className="text-[10px] uppercase tracking-wider text-gray-500">
                    Signed In
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${roleConfig.styles}`}
                >
                  <RoleIcon size={10} />
                  {role}
                </span>
              </div>

              {/* LOGOUT */}
              <button
                onClick={handleLogout}
                className={`${actionButton} rounded-xl border border-transparent px-3 py-2 text-gray-400 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400`}
              >
                <LogOut size={15} />

                <span className="hidden sm:inline">
                  Logout
                </span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 transition hover:text-white"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar