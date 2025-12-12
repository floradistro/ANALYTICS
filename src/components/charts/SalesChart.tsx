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
          curve="monotoneX"
          colors={[colors.chart.seriesBlue[0]]}
          lineWidth={2}
          enablePoints={false}
          enableArea={true}
          areaOpacity={0.1}
          areaBaselineValue={0}
          enableGridX={false}
          enableGridY={true}
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
          }}
          pointSize={0}
          useMesh={true}
          enableSlices="x"
          sliceTooltip={({ slice }) => (
            <div
              style={{
                background: colors.chart.tooltip.bg,
                border: `1px solid ${colors.chart.tooltip.border}`,
                borderRadius: '6px',
                padding: '12px 16px',
              }}
            >
              <div className="text-xs text-zinc-500 mb-1">
                {formatDate(slice.points[0].data.x)}
              </div>
              <div className="text-sm font-medium text-zinc-100">
                {metric === 'revenue'
                  ? formatCurrency(Number(slice.points[0].data.y))
                  : `${slice.points[0].data.y} orders`}
              </div>
            </div>
          )}
          animate={true}
          motionConfig="gentle"
          defs={[
            {
              id: 'areaGradient',
              type: 'linearGradient',
              colors: [
                { offset: 0, color: colors.chart.seriesBlue[0], opacity: 0.2 },
                { offset: 100, color: colors.chart.seriesBlue[0], opacity: 0 },
              ],
            },
          ]}
          fill={[{ match: '*', id: 'areaGradient' }]}
        />
      </div>
    </div>
  )
}
