'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  format?: 'currency' | 'number' | 'percent'
}

export function MetricCard({ title, value, change, icon: Icon, format = 'number' }: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val)
      case 'percent':
        return `${val.toFixed(1)}%`
      default:
        return new Intl.NumberFormat('en-US').format(val)
    }
  }

  const isPositive = change !== undefined && change >= 0

  return (
    <div className="bg-zinc-950 border border-zinc-900 p-6 hover:border-zinc-800 transition-colors">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-500" />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 px-2 py-1 text-xs font-light ${
              isPositive ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-light text-white mt-1">{formatValue(value)}</p>
      </div>
    </div>
  )
}
