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
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/sales', label: 'Sales Analytics', icon: TrendingUp },
  { href: '/dashboard/traffic', label: 'Web Analytics', icon: Activity },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/shipments', label: 'Shipments', icon: Truck },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/map', label: 'Location Map', icon: Map },
  { href: '/dashboard/reports', label: 'Financial Reports', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { vendor, logout } = useAuthStore()
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
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-black border-r border-zinc-900 min-h-screen flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-4 lg:p-6 border-b border-zinc-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 rounded-sm">
                {vendor?.logo_url ? (
                  <img
                    src={vendor.logo_url}
                    alt={vendor.store_name || 'Logo'}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-white font-bold text-base lg:text-lg">
                    {vendor?.store_name?.[0] || 'W'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-medium text-white text-sm tracking-wide truncate">
                  {vendor?.store_name || 'Dashboard'}
                </h1>
                <p className="text-zinc-500 text-xs tracking-wider uppercase">Analytics</p>
              </div>
            </div>
            {/* Close button (mobile only) */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 text-zinc-500 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 lg:p-4 overflow-y-auto">
          <ul className="space-y-0.5 lg:space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 transition-all duration-200 ${
                      isActive
                        ? 'bg-zinc-900 text-white border-l-2 border-slate-400'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-light tracking-wide">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-3 lg:p-4 border-t border-zinc-900">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 transition-all duration-200 w-full"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-light tracking-wide">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
