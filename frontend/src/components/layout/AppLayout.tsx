import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Clock,
  Upload,
  Cpu,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  User,
  LayoutGrid,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Activity,
  Brain,
  DollarSign,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'Overview', href: '/', icon: BarChart3, badge: null },
  { name: 'Shop Floor Twin', href: '/shop-floor', icon: LayoutGrid, badge: 'Live' },
  { name: 'Predictive AI', href: '/predictive-maintenance', icon: Brain, badge: 'AI' },
  { name: 'Financial Loss', href: '/loss-calculator', icon: DollarSign, badge: 'ROI' },
  { name: 'Downtime Logs', href: '/downtime-logs', icon: Clock, badge: null },
  { name: 'Machines', href: '/machines', icon: Cpu, badge: null },
  { name: 'Shifts', href: '/shifts', icon: TrendingUp, badge: null },
  { name: 'Import Center', href: '/imports', icon: Upload, badge: null },
  { name: 'Reports', href: '/reports', icon: FileText, badge: null },
  { name: 'Settings', href: '/settings', icon: Settings, badge: null },
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  const currentPage = navigation.find((item) => isActive(item.href)) || {
    name: 'Dashboard',
    href: '/',
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const q = searchQuery.toLowerCase()
    if (q.includes('machine') || q.includes('cnc') || q.includes('laser')) {
      navigate('/machines')
    } else if (q.includes('floor') || q.includes('twin')) {
      navigate('/shop-floor')
    } else if (q.includes('log') || q.includes('event')) {
      navigate('/downtime-logs')
    } else if (q.includes('shift')) {
      navigate('/shifts')
    } else if (q.includes('import') || q.includes('upload')) {
      navigate('/imports')
    } else if (q.includes('report') || q.includes('export')) {
      navigate('/reports')
    } else if (q.includes('setting') || q.includes('plant')) {
      navigate('/settings')
    } else {
      navigate('/')
    }
    setSearchQuery('')
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F7FA] text-[#172033]">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out bg-[#0F172A] text-slate-300 border-r border-slate-800 shadow-xl lg:shadow-none ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-slate-950/40">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
              <Activity size={20} className="animate-pulse" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                  FactoryPulse
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    Pro
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 truncate">
                  Downtime Intelligence
                </span>
              </div>
            )}
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.name : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon
                  size={19}
                  className={`flex-shrink-0 transition-transform ${
                    active ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'
                  }`}
                />

                {!collapsed && (
                  <span className="truncate flex-1">{item.name}</span>
                )}

                {!collapsed && item.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Tooltip */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-xs whitespace-nowrap shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700">
                    {item.name}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Collapse Toggle Button (Desktop Only) */}
        <div className="hidden lg:flex items-center justify-end px-3 py-2 border-t border-slate-800/80">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors w-full flex items-center justify-center gap-2 text-xs"
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse Menu</span>
              </>
            )}
          </button>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div
            className={`flex items-center gap-3 p-2 rounded-lg ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300 font-semibold text-xs flex-shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.name || 'Administrator'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'admin@factorypulse.com'}
                </p>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between gap-4 z-20 flex-shrink-0">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <Link to="/" className="hover:text-[#0F766E] transition-colors">
                  FactoryPulse
                </Link>
                <span>/</span>
                <span className="text-[#172033] font-medium truncate">
                  {currentPage.name}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#172033] leading-none mt-0.5 truncate">
                {currentPage.name}
              </h1>
            </div>
          </div>

          {/* Middle: Global Quick Search */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center relative max-w-xs w-full"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search equipment, logs, reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-14 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#172033] placeholder-slate-400 focus:outline-none focus:border-[#0F766E] focus:bg-white transition-all"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
              ↵
            </span>
          </form>

          {/* Right: API Status, Notifications & Profile */}
          <div className="flex items-center gap-3">
            {/* Live API Health Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected to API</span>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
                title="Notifications"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0F766E]" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-[#E2E8F0] shadow-dropdown p-4 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-900">Notifications</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-medium">
                      2 New
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 mt-1">
                    <div className="py-2">
                      <p className="font-medium text-slate-800">Laser Cutter 01 Offline</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Emergency stop triggered on Line 1.
                      </p>
                    </div>
                    <div className="py-2">
                      <p className="font-medium text-slate-800">Shift A Target Met</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        98.4% uptime achieved during morning run.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0F766E] text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#172033] leading-none">
                    {user?.name || 'Administrator'}
                  </span>
                  <span className="text-[10px] text-[#64748B] mt-0.5 leading-none">
                    Plant Manager
                  </span>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white border border-[#E2E8F0] shadow-dropdown py-1.5 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-semibold text-slate-900">{user?.name || 'Admin User'}</p>
                    <p className="text-slate-500 truncate">{user?.email || 'admin@factorypulse.com'}</p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    <User size={14} />
                    Account Settings
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    <Settings size={14} />
                    System Preferences
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F5F7FA]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
