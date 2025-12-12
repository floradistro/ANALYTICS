'use client'

import { ResponsiveBar } from '@nivo/bar'
import { nivoTheme, colors, formatCurrency } from '@/lib/theme'

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
  const chartData = data.map((item) => ({
    product: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    fullName: item.name,
    revenue: item.revenue,
    totalSold: item.totalSold,
  }))

  if (data.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-800/50 p-4 lg:p-6 rounded-sm">
        <h3 className="text-xs lg:text-sm font-light text-zinc-200 mb-4 lg:mb-6 tracking-wide uppercase">
          Top Products by Revenue
        </h3>
        <div className="h-[200px] lg:h-[300px] flex items-center justify-center text-zinc-600 text-xs lg:text-sm">
          No product data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/50 p-4 lg:p-6 rounded-sm">
      <h3 className="text-xs lg:text-sm font-light text-zinc-200 mb-4 lg:mb-6 tracking-wide uppercase">
        Top Products by Revenue
      </h3>
      <div className="h-[200px] lg:h-[300px]">
        <ResponsiveBar
          data={chartData}
          theme={nivoTheme}
          keys={['revenue']}
          indexBy="product"
          layout="horizontal"
          margin={{ top: 10, right: 20, bottom: 10, left: 120 }}
          padding={0.35}
          colors={[colors.chart.seriesBlue[1]]}
          borderRadius={3}
          enableGridX={true}
          enableGridY={false}
          axisTop={null}
          axisRight={null}
          axisBottom={null}
          axisLeft={{
            tickSize: 0,
            tickPadding: 12,
            tickRotation: 0,
          }}
          enableLabel={false}
          tooltip={({ data: d, value }) => (
            <div
              style={{
                background: colors.chart.tooltip.bg,
                border: `1px solid ${colors.chart.tooltip.border}`,
                borderRadius: '6px',
                padding: '12px 16px',
              }}
            >
              <div className="text-xs text-zinc-400 mb-1">{d.fullName}</div>
              <div className="text-sm font-medium text-zinc-100">
                {formatCurrency(value)}
              </div>
              <div className="text-xs text-zinc-500">
                {d.totalSold} units sold
              </div>
            </div>
          )}
          animate={true}
          motionConfig="gentle"
        />
      </div>
    </div>
  )
}
