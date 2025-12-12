'use client'

import { useState, useEffect, useRef } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'

interface SalesData {
  date: string
  revenue: number
  orders: number
}

interface SalesChartProps {
  data: SalesData[]
  metric?: 'revenue' | 'orders'
}

export function SalesChart({ data, metric = 'revenue' }: SalesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setDimensions({ width, height })
        }
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="bg-zinc-950 border border-zinc-900 p-6">
      <h3 className="text-sm font-light text-white mb-6 tracking-wide">
        {metric === 'revenue' ? 'Revenue Trend' : 'Orders Trend'}
      </h3>
      <div ref={containerRef} className="h-[300px] min-h-[300px]">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric === 'revenue' ? '#10b981' : '#0071e3'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={metric === 'revenue' ? '#10b981' : '#0071e3'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={metric === 'revenue' ? formatCurrency : undefined}
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) =>
                  metric === 'revenue' ? formatCurrency(value) : value
                }
                labelFormatter={formatDate}
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '0',
                  color: '#f5f5f7',
                }}
                labelStyle={{ color: '#71717a' }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={metric === 'revenue' ? '#10b981' : '#0071e3'}
                strokeWidth={2}
                fill={`url(#color${metric})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
