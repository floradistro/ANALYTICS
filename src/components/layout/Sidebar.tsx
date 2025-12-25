'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  LogOut,
  Map,
  Truck,
  Activity,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Package,
  QrCode,
  Warehouse,
  Megaphone,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/sales', label: 'Sales', icon: TrendingUp },
  { href: '/dashboard/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/qr', label: 'QR Codes', icon: QrCode },
  { href: '/dashboard/traffic', label: 'Traffic', icon: Activity },
  { href: '/dashboard/shipments', label: 'Shipments', icon: Truck },
  { href: '/dashboard/operations', label: 'Operations', icon: ClipboardCheck },
  { href: '/dashboard/map', label: 'Map', icon: Map },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { store, logout } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          ${collapsed ? 'w-14' : 'w-48'} bg-black border-r border-zinc-900 h-screen flex flex-col
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className={`${collapsed ? 'p-2' : 'p-3'} border-b border-zinc-900`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'gap-2'}`}>
              <div className={`${collapsed ? 'w-8 h-8' : 'w-8 h-8'} bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 rounded-sm`}>
                {store?.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.store_name || 'Logo'}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {store?.store_name?.[0] || 'W'}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <h1 className="font-medium text-white text-xs tracking-wide truncate">
                    {store?.store_name || 'Dashboard'}
                  </h1>
                </div>
              )}
            </div>
            {/* Close button (mobile only) */}
            {!collapsed && (
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-1 text-zinc-500 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <nav className={`flex-1 ${collapsed ? 'p-1' : 'p-2'} overflow-y-auto`}>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center ${collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-2 py-1.5'} rounded transition-all duration-200 ${
                      isActive
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <span className="text-xs font-light truncate">{item.label}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className={`${collapsed ? 'p-1' : 'p-2'} border-t border-zinc-900 space-y-0.5`}>
          {/* Collapse toggle button (desktop only) */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`hidden lg:flex items-center ${collapsed ? 'justify-center px-2 py-2 w-full' : 'gap-2 px-2 py-1.5 w-full'} text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 rounded transition-all duration-200`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-xs font-light">Collapse</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`flex items-center ${collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-2 py-1.5'} text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 rounded transition-all duration-200 w-full`}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && (
              <span className="text-xs font-light">Logout</span>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
