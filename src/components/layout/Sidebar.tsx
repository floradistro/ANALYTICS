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
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

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

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <aside className="w-64 bg-black border-r border-zinc-900 min-h-screen flex flex-col">
      <div className="p-6 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-900 border border-red-800 flex items-center justify-center overflow-hidden">
            {vendor?.logo_url ? (
              <img
                src={vendor.logo_url}
                alt={vendor.store_name || 'Logo'}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-white font-bold text-lg">
                {vendor?.store_name?.[0] || 'W'}
              </span>
            )}
          </div>
          <div>
            <h1 className="font-medium text-white text-sm tracking-wide">
              {vendor?.store_name || 'Dashboard'}
            </h1>
            <p className="text-zinc-500 text-xs tracking-wider uppercase">Analytics</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                    isActive
                      ? 'bg-zinc-900 text-white border-l-2 border-emerald-500'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-light tracking-wide">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-zinc-900">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 transition-all duration-200 w-full"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-light tracking-wide">Logout</span>
        </button>
      </div>
    </aside>
  )
}
