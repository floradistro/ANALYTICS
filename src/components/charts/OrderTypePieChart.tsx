'use client'

import { useState, useEffect, useRef } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface OrderTypeData {
  type: string
  count: number
  revenue: number
}

interface OrderTypePieChartProps {
  data: OrderTypeData[]
}

const COLORS = ['#10b981', '#0071e3', '#f59e0b', '#ef4444', '#8b5cf6']

const TYPE_LABELS: Record<string, string> = {
  walk_in: 'Walk-in',
  pickup: 'Pickup',
  delivery: 'Delivery',
  shipping: 'Shipping',
}

export function OrderTypePieChart({ data }: OrderTypePieChartProps) {
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

  const chartData = data.map((item) => ({
    ...item,
    name: TYPE_LABELS[item.type] || item.type,
  }))

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)

  if (data.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 p-6">
        <h3 className="text-sm font-light text-white mb-6 tracking-wide">Orders by Type</h3>
        <div className="h-[300px] flex items-center justify-center text-zinc-500 text-sm">
          No order data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 border border-zinc-900 p-6">
      <h3 className="text-sm font-light text-white mb-6 tracking-wide">Orders by Type</h3>
      <div ref={containerRef} className="h-[300px] min-h-[300px]">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#52525b' }}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props) => [
                  `${value} orders (${formatCurrency(props.payload.revenue)})`,
                  props.payload.name,
                ]}
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '0',
                  color: '#f5f5f7',
                }}
              />
              <Legend
                wrapperStyle={{ color: '#71717a', fontSize: '12px' }}
                formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
