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
    <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6 hover:border-zinc-800 transition-colors">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 rounded-sm">
          <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-0.5 lg:gap-1 px-1.5 lg:px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs font-light ${
              isPositive ? 'text-slate-300' : 'text-zinc-500'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
            )}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="mt-2 lg:mt-4">
        <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider truncate">{title}</p>
        <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1 truncate">{formatValue(value)}</p>
      </div>
    </div>
  )
}
