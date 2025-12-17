'use client'

import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'
import { format } from 'date-fns'
import { nivoTheme, colors, formatCurrency } from '@/lib/theme'

interface CheckoutData {
  date: string
  approved: number
  declined: number
  error: number
  total: number
  successRate: number
}

interface CheckoutSuccessChartProps {
  data: CheckoutData[]
  totals: {
    approved: number
    declined: number
    error: number
    total: number
    successRate: number
    totalRevenue: number
    lostRevenue: number
  }
}

export function CheckoutSuccessChart({ data, totals }: CheckoutSuccessChartProps) {
  const pieData = [
    {
      id: 'Approved',
      label: 'Approved',
      value: totals.approved,
      color: '#22c55e',
    },
    {
      id: 'Declined',
      label: 'Declined',
      value: totals.declined,
      color: '#ef4444',
    },
    {
      id: 'Error',
      label: 'Errors',
      value: totals.error,
      color: '#f59e0b',
    },
  ].filter(d => d.value > 0)

  if (data.length === 0 && totals.total === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
        <h3 className="text-sm font-light text-zinc-200 mb-6 tracking-wide uppercase">
          Checkout Analytics
        </h3>
        <div className="h-[300px] flex items-center justify-center text-zinc-600 text-sm">
          No checkout data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
      <h3 className="text-sm font-light text-zinc-200 mb-6 tracking-wide uppercase">
        Checkout Analytics
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-sm text-center">
          <p className="text-2xl font-bold text-white tabular-nums">{totals.total}</p>
          <p className="text-xs text-zinc-500 mt-1">Total Attempts</p>
        </div>
        <div className="bg-green-900/20 border border-green-800/50 p-4 rounded-sm text-center">
          <p className="text-2xl font-bold text-green-400 tabular-nums">{totals.successRate.toFixed(1)}%</p>
          <p className="text-xs text-zinc-500 mt-1">Success Rate</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-sm text-center">
          <p className="text-2xl font-bold text-white tabular-nums">{formatCurrency(totals.totalRevenue)}</p>
          <p className="text-xs text-zinc-500 mt-1">Captured Revenue</p>
        </div>
        <div className="bg-red-900/20 border border-red-800/50 p-4 rounded-sm text-center">
          <p className="text-2xl font-bold text-red-400 tabular-nums">{formatCurrency(totals.lostRevenue)}</p>
          <p className="text-xs text-zinc-500 mt-1">Lost Revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Daily Success Rate Bar Chart */}
        <div>
          <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Daily Checkout Success</h4>
          <div className="h-[220px]">
            {data.length > 0 ? (
              <ResponsiveBar
                data={data.map(d => ({
                  date: format(new Date(d.date), 'MMM d'),
                  Approved: d.approved,
                  Declined: d.declined,
                  Error: d.error,
                }))}
                keys={['Approved', 'Declined', 'Error']}
                indexBy="date"
                theme={nivoTheme}
                margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
                padding={0.3}
                colors={['#22c55e', '#ef4444', '#f59e0b']}
                borderRadius={2}
                enableGridX={false}
                enableGridY={true}
                gridYValues={5}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickRotation: -45,
                }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickValues: 5,
                }}
                enableLabel={false}
                tooltip={({ id, value, indexValue }) => (
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
                    <div className="text-xs text-zinc-400 mb-1">{indexValue}</div>
                    <div className="text-sm font-medium text-white">
                      {value} <span className="text-zinc-400">{id}</span>
                    </div>
                  </div>
                )}
                animate={true}
                motionConfig="gentle"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                No daily data
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div>
          <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Checkout Status Distribution</h4>
          <div className="h-[220px]">
            {pieData.length > 0 ? (
              <ResponsivePie
                data={pieData}
                theme={nivoTheme}
                margin={{ top: 10, right: 80, bottom: 10, left: 10 }}
                innerRadius={0.6}
                padAngle={2}
                cornerRadius={4}
                activeOuterRadiusOffset={8}
                colors={{ datum: 'data.color' }}
                borderWidth={0}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#71717a"
                arcLinkLabelsThickness={1}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#ffffff"
                legends={[
                  {
                    anchor: 'right',
                    direction: 'column',
                    justify: false,
                    translateX: 70,
                    translateY: 0,
                    itemsSpacing: 8,
                    itemWidth: 60,
                    itemHeight: 18,
                    itemTextColor: '#71717a',
                    itemDirection: 'left-to-right',
                    symbolSize: 10,
                    symbolShape: 'circle',
                  },
                ]}
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
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: datum.color }}
                      />
                      <span className="text-sm font-medium text-white">
                        {datum.value} {datum.label}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {totals.total > 0 ? ((datum.value / totals.total) * 100).toFixed(1) : 0}% of total
                    </div>
                  </div>
                )}
                animate={true}
                motionConfig="gentle"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                No data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
