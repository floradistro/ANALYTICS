'use client'

import { ResponsiveLine } from '@nivo/line'
import { format } from 'date-fns'
import { nivoTheme, colors, formatCurrency } from '@/lib/theme'

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
  const chartData = [
    {
      id: metric === 'revenue' ? 'Revenue' : 'Orders',
      data: data.map((item) => ({
        x: item.date,
        y: item[metric],
      })),
    },
  ]

  const formatDate = (value: string | number) => {
    try {
      return format(new Date(String(value)), 'MMM d')
    } catch {
      return String(value)
    }
  }

  if (data.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
        <h3 className="text-sm font-light text-zinc-200 mb-6 tracking-wide uppercase">
          {metric === 'revenue' ? 'Revenue Trend' : 'Orders Trend'}
        </h3>
        <div className="h-[300px] flex items-center justify-center text-zinc-600 text-sm">
          No data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
      <h3 className="text-sm font-light text-zinc-200 mb-6 tracking-wide uppercase">
        {metric === 'revenue' ? 'Revenue Trend' : 'Orders Trend'}
      </h3>
      <div className="h-[300px]">
        <ResponsiveLine
          data={chartData}
          theme={nivoTheme}
          margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
          curve="catmullRom"
          colors={['url(#lineGradient)']}
          lineWidth={2.5}
          enablePoints={true}
          pointSize={0}
          pointBorderWidth={0}
          enableArea={true}
          areaOpacity={1}
          areaBaselineValue={0}
          enableGridX={false}
          enableGridY={true}
          gridYValues={5}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 12,
            tickRotation: 0,
            format: formatDate,
            tickValues: data.length > 10 ? 'every 2 values' : undefined,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 12,
            tickRotation: 0,
            format: metric === 'revenue' ? (v) => formatCurrency(Number(v)) : undefined,
            tickValues: 5,
          }}
          useMesh={true}
          enableSlices="x"
          sliceTooltip={({ slice }) => (
            <div
              style={{
                background: 'rgba(24, 24, 27, 0.95)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${colors.chart.tooltip.border}`,
                borderRadius: '8px',
                padding: '12px 16px',
                boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div className="text-xs text-zinc-400 mb-1.5">
                {format(new Date(String(slice.points[0].data.x)), 'EEE, MMM d')}
              </div>
              <div className="text-base font-medium text-white">
                {metric === 'revenue'
                  ? formatCurrency(Number(slice.points[0].data.y))
                  : <>{slice.points[0].data.y} <span className="text-zinc-400 text-sm font-normal">orders</span></>}
              </div>
            </div>
          )}
          animate={true}
          motionConfig="gentle"
          defs={[
            {
              id: 'areaGradient',
              type: 'linearGradient',
              x1: '0%',
              y1: '0%',
              x2: '0%',
              y2: '100%',
              colors: [
                { offset: 0, color: '#94a3b8', opacity: 0.35 },
                { offset: 60, color: '#64748b', opacity: 0.1 },
                { offset: 100, color: '#475569', opacity: 0.02 },
              ],
            },
            {
              id: 'lineGradient',
              type: 'linearGradient',
              x1: '0%',
              y1: '0%',
              x2: '100%',
              y2: '0%',
              colors: [
                { offset: 0, color: '#64748b', opacity: 1 },
                { offset: 50, color: '#94a3b8', opacity: 1 },
                { offset: 100, color: '#cbd5e1', opacity: 1 },
              ],
            },
          ]}
          fill={[{ match: '*', id: 'areaGradient' }]}
        />
      </div>
    </div>
  )
}
