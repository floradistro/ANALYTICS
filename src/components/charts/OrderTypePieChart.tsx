'use client'

import { ResponsivePie } from '@nivo/pie'
import { nivoTheme, colors, chartSeriesBlueColors, formatCurrency } from '@/lib/theme'

interface OrderTypeData {
  type: string
  count: number
  revenue: number
}

interface OrderTypePieChartProps {
  data: OrderTypeData[]
}

const TYPE_LABELS: Record<string, string> = {
  walk_in: 'Walk-in',
  pickup: 'Pickup',
  delivery: 'Delivery',
  shipping: 'Shipping',
}

export function OrderTypePieChart({ data }: OrderTypePieChartProps) {
  const chartData = data.map((item, index) => ({
    id: TYPE_LABELS[item.type] || item.type,
    label: TYPE_LABELS[item.type] || item.type,
    value: item.count,
    revenue: item.revenue,
    color: colors.chart.seriesBlue[index % colors.chart.seriesBlue.length],
  }))

  if (data.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
        <h3 className="text-sm font-light text-zinc-200 mb-6 tracking-wide uppercase">
          Orders by Type
        </h3>
        <div className="h-[300px] flex items-center justify-center text-zinc-600 text-sm">
          No order data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
      <h3 className="text-sm font-light text-zinc-200 mb-6 tracking-wide uppercase">
        Orders by Type
      </h3>
      <div className="h-[300px]">
        <ResponsivePie
          data={chartData}
          theme={nivoTheme}
          margin={{ top: 20, right: 80, bottom: 40, left: 80 }}
          innerRadius={0.6}
          padAngle={1}
          cornerRadius={4}
          activeOuterRadiusOffset={8}
          colors={chartSeriesBlueColors}
          borderWidth={0}
          enableArcLinkLabels={true}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor={colors.text.secondary}
          arcLinkLabelsThickness={1}
          arcLinkLabelsColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
          arcLinkLabelsDiagonalLength={12}
          arcLinkLabelsStraightLength={12}
          enableArcLabels={false}
          tooltip={({ datum }) => (
            <div
              style={{
                background: colors.chart.tooltip.bg,
                border: `1px solid ${colors.chart.tooltip.border}`,
                borderRadius: '6px',
                padding: '12px 16px',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: datum.color }}
                />
                <span className="text-xs text-zinc-400">{datum.label}</span>
              </div>
              <div className="text-sm font-medium text-zinc-100">
                {datum.value} orders
              </div>
              <div className="text-xs text-zinc-500">
                {formatCurrency(datum.data.revenue as number)} revenue
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
