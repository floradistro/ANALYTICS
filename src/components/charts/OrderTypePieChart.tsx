'use client'

import { ResponsivePie } from '@nivo/pie'
import { nivoTheme, colors, formatCurrency } from '@/lib/theme'

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

// Refined monochrome color palette for pie segments
const PIE_COLORS = [
  '#cbd5e1', // slate-300 (lightest)
  '#94a3b8', // slate-400
  '#64748b', // slate-500
  '#475569', // slate-600
  '#334155', // slate-700 (darkest)
]

export function OrderTypePieChart({ data }: OrderTypePieChartProps) {
  const chartData = data.map((item, index) => ({
    id: TYPE_LABELS[item.type] || item.type,
    label: TYPE_LABELS[item.type] || item.type,
    value: item.count,
    revenue: item.revenue,
    color: PIE_COLORS[index % PIE_COLORS.length],
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
          margin={{ top: 30, right: 90, bottom: 30, left: 90 }}
          innerRadius={0.65}
          padAngle={2}
          cornerRadius={6}
          activeOuterRadiusOffset={6}
          activeInnerRadiusOffset={3}
          colors={{ datum: 'data.color' }}
          borderWidth={0}
          enableArcLinkLabels={true}
          arcLinkLabelsSkipAngle={12}
          arcLinkLabelsTextColor={colors.text.secondary}
          arcLinkLabelsThickness={1.5}
          arcLinkLabelsColor={{ from: 'color', modifiers: [['opacity', 0.6]] }}
          arcLinkLabelsDiagonalLength={16}
          arcLinkLabelsStraightLength={16}
          arcLinkLabelsTextOffset={6}
          enableArcLabels={false}
          tooltip={({ datum }) => (
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
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ background: datum.color }}
                />
                <span className="text-sm text-zinc-200 font-medium">{datum.label}</span>
              </div>
              <div className="text-base font-medium text-white mb-0.5">
                {datum.value.toLocaleString()} <span className="text-zinc-400 text-sm font-normal">orders</span>
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
