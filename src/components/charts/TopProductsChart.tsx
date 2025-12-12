'use client'

import { useState, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TopProduct {
  id: string
  name: string
  totalSold: number
  revenue: number
}

interface TopProductsChartProps {
  data: TopProduct[]
}

export function TopProductsChart({ data }: TopProductsChartProps) {
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

  const chartData = data.map((item) => ({
    ...item,
    shortName: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
  }))

  if (data.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 p-6">
        <h3 className="text-sm font-light text-white mb-6 tracking-wide">Top Products by Revenue</h3>
        <div className="h-[300px] flex items-center justify-center text-zinc-500 text-sm">
          No product data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 border border-zinc-900 p-6">
      <h3 className="text-sm font-light text-white mb-6 tracking-wide">Top Products by Revenue</h3>
      <div ref={containerRef} className="h-[300px] min-h-[300px]">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={formatCurrency}
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                stroke="#52525b"
                fontSize={11}
                width={150}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label: string) => {
                  const item = chartData.find((d) => d.shortName === label)
                  return item?.name || label
                }}
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '0',
                  color: '#f5f5f7',
                }}
                labelStyle={{ color: '#71717a' }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
