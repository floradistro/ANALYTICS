/**
 * Monochrome Luxury Theme
 * Cool gray palette with subtle blue accents
 */

// Core color palette
export const colors = {
  // Backgrounds (darkest to lightest)
  bg: {
    primary: '#09090b',      // zinc-950 - main background
    secondary: '#18181b',    // zinc-900 - card backgrounds
    tertiary: '#27272a',     // zinc-800 - elevated elements
    hover: '#3f3f46',        // zinc-700 - hover states
  },

  // Text (lightest to darkest)
  text: {
    primary: '#fafafa',      // zinc-50 - main text
    secondary: '#a1a1aa',    // zinc-400 - secondary text
    muted: '#71717a',        // zinc-500 - muted text
    disabled: '#52525b',     // zinc-600 - disabled text
  },

  // Borders
  border: {
    subtle: '#27272a',       // zinc-800
    default: '#3f3f46',      // zinc-700
    strong: '#52525b',       // zinc-600
  },

  // Accent - subtle blue-gray
  accent: {
    subtle: '#334155',       // slate-700
    default: '#475569',      // slate-600
    strong: '#64748b',       // slate-500
    muted: '#1e293b',        // slate-800
  },

  // Chart colors - monochrome gradient series
  chart: {
    series: [
      '#e4e4e7',  // zinc-200 - primary series
      '#a1a1aa',  // zinc-400
      '#71717a',  // zinc-500
      '#52525b',  // zinc-600
      '#3f3f46',  // zinc-700
      '#27272a',  // zinc-800
    ],
    // Alternative with subtle blue tint
    seriesBlue: [
      '#e2e8f0',  // slate-200 - primary series
      '#94a3b8',  // slate-400
      '#64748b',  // slate-500
      '#475569',  // slate-600
      '#334155',  // slate-700
      '#1e293b',  // slate-800
    ],
    highlight: '#f8fafc',    // slate-50 - highlighted data
    grid: '#27272a',         // zinc-800 - grid lines
    axis: '#52525b',         // zinc-600 - axis lines
    tooltip: {
      bg: '#18181b',
      border: '#3f3f46',
      text: '#fafafa',
    },
  },

  // Status colors - muted monochrome versions
  status: {
    success: '#a1a1aa',      // muted - no bright green
    warning: '#71717a',      // muted
    error: '#52525b',        // muted - no bright red
    info: '#64748b',         // subtle blue-gray
  },
}

// Chart color arrays for Nivo (mutable copies)
export const chartSeriesColors = [...colors.chart.series]
export const chartSeriesBlueColors = [...colors.chart.seriesBlue]

// Nivo theme configuration
export const nivoTheme = {
  background: 'transparent',
  text: {
    fontSize: 11,
    fill: colors.text.secondary,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  axis: {
    domain: {
      line: {
        stroke: colors.chart.axis,
        strokeWidth: 1,
      },
    },
    legend: {
      text: {
        fontSize: 12,
        fill: colors.text.secondary,
        fontWeight: 500,
      },
    },
    ticks: {
      line: {
        stroke: colors.chart.grid,
        strokeWidth: 1,
      },
      text: {
        fontSize: 11,
        fill: colors.text.muted,
      },
    },
  },
  grid: {
    line: {
      stroke: colors.chart.grid,
      strokeWidth: 1,
    },
  },
  legends: {
    title: {
      text: {
        fontSize: 12,
        fill: colors.text.secondary,
      },
    },
    text: {
      fontSize: 11,
      fill: colors.text.secondary,
    },
    ticks: {
      line: {},
      text: {
        fontSize: 10,
        fill: colors.text.muted,
      },
    },
  },
  annotations: {
    text: {
      fontSize: 13,
      fill: colors.text.primary,
      outlineWidth: 2,
      outlineColor: colors.bg.primary,
      outlineOpacity: 1,
    },
    link: {
      stroke: colors.text.muted,
      strokeWidth: 1,
      outlineWidth: 2,
      outlineColor: colors.bg.primary,
      outlineOpacity: 1,
    },
    outline: {
      stroke: colors.text.muted,
      strokeWidth: 2,
      outlineWidth: 2,
      outlineColor: colors.bg.primary,
      outlineOpacity: 1,
    },
    symbol: {
      fill: colors.text.secondary,
      outlineWidth: 2,
      outlineColor: colors.bg.primary,
      outlineOpacity: 1,
    },
  },
  tooltip: {
    container: {
      background: colors.chart.tooltip.bg,
      color: colors.chart.tooltip.text,
      fontSize: 12,
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
      padding: '12px 16px',
      border: `1px solid ${colors.chart.tooltip.border}`,
    },
    basic: {},
    chip: {},
    table: {},
    tableCell: {},
    tableCellValue: {},
  },
} as const

// Common chart props for consistent styling
export const chartDefaults = {
  animate: true,
  motionConfig: 'gentle' as const,

  // Area/Line chart defaults
  area: {
    enableGridX: false,
    enableGridY: true,
    enablePoints: false,
    enableArea: true,
    areaOpacity: 0.15,
    curve: 'monotoneX' as const,
    colors: colors.chart.seriesBlue,
    lineWidth: 2,
  },

  // Bar chart defaults
  bar: {
    enableGridX: false,
    enableGridY: true,
    enableLabel: false,
    colors: colors.chart.seriesBlue,
    borderRadius: 4,
    padding: 0.3,
  },

  // Pie chart defaults
  pie: {
    innerRadius: 0.6,
    padAngle: 0.5,
    cornerRadius: 4,
    colors: colors.chart.seriesBlue,
    enableArcLinkLabels: false,
    enableArcLabels: false,
    activeOuterRadiusOffset: 8,
  },
} as const

// Utility function to format currency
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Utility function to format compact numbers
export const formatCompact = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
