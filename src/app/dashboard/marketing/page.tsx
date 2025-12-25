'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Mail, Target, Users, TrendingUp, Send, Eye, MousePointer,
  AlertCircle, CheckCircle,
  ChevronRight, Plus, ArrowDownRight,
  Info, Globe, ShoppingCart, Repeat, BarChart3, RefreshCw
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { CampaignModal } from '@/components/marketing/CampaignModal'
import { SegmentModal } from '@/components/marketing/SegmentModal'
import { MetaCampaignModal } from '@/components/marketing/MetaCampaignModal'

type Tab = 'overview' | 'email' | 'meta' | 'segments'

interface EmailCampaign {
  id: string
  name: string
  subject: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused'
  total_recipients: number
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_bounced: number
  send_at: string | null
  sent_at: string | null
  created_at: string
}

interface MetaCampaign {
  id: string
  name: string
  status: string
  effective_status: string
  objective: string | null
  daily_budget: number | null
  lifetime_budget: number | null
  impressions: number
  reach: number
  clicks: number
  spend: number
  cpc: number | null
  cpm: number | null
  ctr: number | null
  conversions: number
  conversion_value: number
  roas: number | null
  start_time: string | null
  stop_time: string | null
  last_synced_at: string | null
  meta_campaign_id: string
  raw_insights?: {
    actions?: Array<{ action_type: string; value: string }>
    date_start?: string
    date_stop?: string
    [key: string]: any
  }
}

interface CustomerSegment {
  id: string
  name: string
  description: string | null
  customer_count: number
  is_active: boolean
  type: string
  color: string | null
  last_refreshed_at: string | null
  created_at: string
}

interface EmailStats {
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  delivery_rate: number
  open_rate: number
  click_rate: number
}

interface WebStats {
  visitors: number
  sessions: number
  customers: number
  repeat_customers: number
}

export default function MarketingPage() {
  const { storeId } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  // Data
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([])
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([])
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [emailStats, setEmailStats] = useState<EmailStats>({
    total_sent: 0, total_delivered: 0, total_opened: 0, total_clicked: 0,
    delivery_rate: 0, open_rate: 0, click_rate: 0
  })
  const [webStats, setWebStats] = useState<WebStats>({
    visitors: 0, sessions: 0, customers: 0, repeat_customers: 0
  })

  // Modals
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null)
  const [showNewCampaign, setShowNewCampaign] = useState(false)

  // Meta sync
  const [syncingMeta, setSyncingMeta] = useState(false)
  const [metaSyncResult, setMetaSyncResult] = useState<{ success: boolean; message: string } | null>(null)
  const [selectedMetaCampaign, setSelectedMetaCampaign] = useState<MetaCampaign | null>(null)

  const fetchData = useCallback(async () => {
    if (!storeId) return
    setLoading(true)

    try {
      // Email campaigns
      const { data: campaigns } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      setEmailCampaigns(campaigns || [])

      // Email stats from email_sends
      const { data: sends } = await supabase
        .from('email_sends')
        .select('status, opened_at, clicked_at, bounced_at, delivered_at')
        .eq('store_id', storeId)

      if (sends) {
        const total_sent = sends.length
        const total_delivered = sends.filter(s => s.delivered_at || s.status === 'delivered').length
        const total_opened = sends.filter(s => s.opened_at).length
        const total_clicked = sends.filter(s => s.clicked_at).length
        setEmailStats({
          total_sent,
          total_delivered,
          total_opened,
          total_clicked,
          delivery_rate: total_sent > 0 ? (total_delivered / total_sent) * 100 : 0,
          open_rate: total_delivered > 0 ? (total_opened / total_delivered) * 100 : 0,
          click_rate: total_opened > 0 ? (total_clicked / total_opened) * 100 : 0,
        })
      }

      // Meta campaigns
      const { data: meta } = await supabase
        .from('meta_campaigns')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      setMetaCampaigns(meta || [])

      // Customer segments
      const { data: segs } = await supabase
        .from('customer_segments')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('customer_count', { ascending: false })

      setSegments(segs || [])

      // Web stats (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: visitors } = await supabase
        .from('website_visitors')
        .select('visitor_id, session_id')
        .eq('store_id', storeId)
        .gte('created_at', thirtyDaysAgo)
        .or('is_bot.is.null,is_bot.eq.false')

      const { data: orders } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('store_id', storeId)
        .eq('payment_status', 'paid')
        .gte('created_at', thirtyDaysAgo)

      if (visitors && orders) {
        const uniqueVisitors = new Set(visitors.map(v => v.visitor_id)).size
        const uniqueSessions = new Set(visitors.map(v => v.session_id)).size
        const customerIds = orders.map(o => o.customer_id).filter(Boolean)
        const uniqueCustomers = new Set(customerIds).size
        const customerCounts = new Map<string, number>()
        customerIds.forEach(id => customerCounts.set(id, (customerCounts.get(id) || 0) + 1))
        const repeatCustomers = Array.from(customerCounts.values()).filter(c => c > 1).length

        setWebStats({
          visitors: uniqueVisitors,
          sessions: uniqueSessions,
          customers: uniqueCustomers,
          repeat_customers: repeatCustomers,
        })
      }

    } catch (err) {
      console.error('Marketing fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-sync Meta campaigns on load and every 5 minutes
  useEffect(() => {
    if (!storeId) return

    // Sync on initial load
    const initialSync = async () => {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-meta-campaigns`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ storeId }),
          }
        )
        // Refresh data after sync
        fetchData()
      } catch (err) {
        console.error('Auto-sync Meta error:', err)
      }
    }

    initialSync()

    // Set up periodic sync every 5 minutes
    const interval = setInterval(initialSync, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [storeId, fetchData])

  const syncMetaCampaigns = async () => {
    if (!storeId || syncingMeta) return
    setSyncingMeta(true)
    setMetaSyncResult(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-meta-campaigns`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ storeId }),
        }
      )

      const result = await response.json()

      if (result.success) {
        setMetaSyncResult({
          success: true,
          message: `Synced ${result.campaigns_synced} campaigns from Meta`
        })
        // Refresh data
        fetchData()
      } else {
        setMetaSyncResult({
          success: false,
          message: result.error || 'Sync failed'
        })
      }
    } catch (err) {
      console.error('Meta sync error:', err)
      setMetaSyncResult({
        success: false,
        message: 'Failed to connect to Meta'
      })
    } finally {
      setSyncingMeta(false)
      // Clear result after 5 seconds
      setTimeout(() => setMetaSyncResult(null), 5000)
    }
  }

  const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n)
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
  const formatPercent = (n: number) => `${n.toFixed(1)}%`

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'meta', label: 'Meta', icon: Target },
    { id: 'segments', label: 'Segments', icon: Users },
  ]

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent': case 'active': case 'delivered': return 'text-emerald-400 bg-emerald-400/10'
      case 'draft': return 'text-zinc-400 bg-zinc-400/10'
      case 'scheduled': case 'pending': return 'text-blue-400 bg-blue-400/10'
      case 'paused': return 'text-amber-400 bg-amber-400/10'
      case 'sending': return 'text-cyan-400 bg-cyan-400/10'
      default: return 'text-zinc-500 bg-zinc-500/10'
    }
  }

  const totalMetaSpend = metaCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0)
  const totalMetaImpressions = metaCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0)
  const conversionRate = webStats.visitors > 0 ? (webStats.customers / webStats.visitors) * 100 : 0
  const repeatRate = webStats.customers > 0 ? (webStats.repeat_customers / webStats.customers) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-white">Marketing</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Campaigns, audiences, and performance</p>
        </div>
        <button
          onClick={() => setShowNewCampaign(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-medium hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-900">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'text-white border-white'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Data Context Header */}
              <div className="flex items-start gap-3 p-3 bg-zinc-900/30 border border-zinc-800">
                <Info className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-zinc-400 leading-relaxed">
                  <span className="text-zinc-300 font-medium">Last 30 Days</span> — All metrics below are calculated from
                  your website analytics, order data, and email campaigns from the past 30 days.
                  Click any metric card for details on how it's calculated.
                </div>
              </div>

              {/* Key Metrics with Detailed Context */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Visitors */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 group relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="w-3 h-3 text-zinc-600" />
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Website Visitors</div>
                  </div>
                  <div className="text-xl font-semibold text-white">{formatNumber(webStats.visitors)}</div>
                  <div className="text-[10px] text-zinc-600 mt-1">Unique visitors tracked via pixel</div>
                  {/* Tooltip on hover */}
                  <div className="absolute left-0 right-0 -bottom-1 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="bg-zinc-800 border border-zinc-700 p-2 text-[10px] text-zinc-300 mx-1 shadow-lg">
                      <div className="font-medium text-white mb-1">How it's calculated</div>
                      <div>Count of unique visitor IDs from <code className="text-amber-400">website_visitors</code> table,
                      excluding bots, in the last 30 days.</div>
                    </div>
                  </div>
                </div>

                {/* Customers */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 group relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShoppingCart className="w-3 h-3 text-zinc-600" />
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Paying Customers</div>
                  </div>
                  <div className="text-xl font-semibold text-white">{formatNumber(webStats.customers)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-emerald-400">{formatPercent(conversionRate)}</span>
                    <span className="text-[10px] text-zinc-600">of visitors converted</span>
                  </div>
                  <div className="absolute left-0 right-0 -bottom-1 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="bg-zinc-800 border border-zinc-700 p-2 text-[10px] text-zinc-300 mx-1 shadow-lg">
                      <div className="font-medium text-white mb-1">How it's calculated</div>
                      <div>Unique customer IDs from <code className="text-amber-400">orders</code> table with
                      payment_status = 'paid' in the last 30 days.</div>
                    </div>
                  </div>
                </div>

                {/* Repeat Customers */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 group relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Repeat className="w-3 h-3 text-zinc-600" />
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Repeat Buyers</div>
                  </div>
                  <div className="text-xl font-semibold text-white">{formatNumber(webStats.repeat_customers)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-emerald-400">{formatPercent(repeatRate)}</span>
                    <span className="text-[10px] text-zinc-600">retention rate</span>
                  </div>
                  <div className="absolute left-0 right-0 -bottom-1 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="bg-zinc-800 border border-zinc-700 p-2 text-[10px] text-zinc-300 mx-1 shadow-lg">
                      <div className="font-medium text-white mb-1">How it's calculated</div>
                      <div>Customers who placed 2+ orders in the last 30 days.
                      Retention = repeat / total customers.</div>
                    </div>
                  </div>
                </div>

                {/* Email Stats */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 group relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Mail className="w-3 h-3 text-zinc-600" />
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Emails Sent</div>
                  </div>
                  <div className="text-xl font-semibold text-white">{formatNumber(emailStats.total_sent)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-emerald-400">{formatPercent(emailStats.open_rate)}</span>
                    <span className="text-[10px] text-zinc-600">opened</span>
                  </div>
                  <div className="absolute left-0 right-0 -bottom-1 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="bg-zinc-800 border border-zinc-700 p-2 text-[10px] text-zinc-300 mx-1 shadow-lg">
                      <div className="font-medium text-white mb-1">How it's calculated</div>
                      <div>Total records from <code className="text-amber-400">email_sends</code> table.
                      Open rate = opened / delivered × 100.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Acquisition Funnel with Context */}
              <div className="bg-zinc-950 border border-zinc-900 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-medium text-white">Customer Acquisition Funnel</h3>
                    <p className="text-[10px] text-zinc-600 mt-0.5">How visitors convert to repeat customers over 30 days</p>
                  </div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    Based on {formatNumber(webStats.visitors + webStats.customers)} data points
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      icon: Globe,
                      label: 'Website Visitors',
                      description: 'Unique visitors tracked by analytics pixel',
                      value: webStats.visitors,
                      percent: 100,
                      color: 'bg-zinc-600'
                    },
                    {
                      icon: ShoppingCart,
                      label: 'Paying Customers',
                      description: 'Visitors who completed a purchase',
                      value: webStats.customers,
                      percent: conversionRate,
                      color: 'bg-emerald-600',
                      dropoff: webStats.visitors > 0 ? 100 - conversionRate : 0
                    },
                    {
                      icon: Repeat,
                      label: 'Repeat Buyers',
                      description: 'Customers who ordered 2+ times',
                      value: webStats.repeat_customers,
                      percent: repeatRate,
                      color: 'bg-blue-600',
                      dropoff: webStats.customers > 0 ? 100 - repeatRate : 0
                    },
                  ].map((step, i) => {
                    const Icon = step.icon
                    return (
                      <div key={step.label}>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3.5 h-3.5 text-zinc-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <span className="text-xs text-white font-medium">{step.label}</span>
                                <span className="text-[10px] text-zinc-600 ml-2">{step.description}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-white font-medium">{formatNumber(step.value)}</span>
                                <span className="text-[10px] text-zinc-500 ml-1">({formatPercent(step.percent)})</span>
                              </div>
                            </div>
                            <div className="h-2 bg-zinc-900 overflow-hidden">
                              <div
                                className={`h-full ${step.color} transition-all`}
                                style={{ width: `${Math.max(step.percent, 2)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {step.dropoff !== undefined && step.dropoff > 0 && (
                          <div className="ml-9 mt-1 flex items-center gap-1 text-[10px] text-zinc-600">
                            <ArrowDownRight className="w-3 h-3 text-red-400/60" />
                            <span>{formatPercent(step.dropoff)} drop-off from previous step</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Email Performance Summary */}
              {emailStats.total_sent > 0 && (
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-medium text-white">Email Performance</h3>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Based on {formatNumber(emailStats.total_sent)} emails sent</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('email')}
                      className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1"
                    >
                      View campaigns <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-2 bg-zinc-900/50">
                      <div className="text-lg font-semibold text-white">{formatNumber(emailStats.total_sent)}</div>
                      <div className="text-[10px] text-zinc-500">Sent</div>
                    </div>
                    <div className="text-center p-2 bg-zinc-900/50">
                      <div className="text-lg font-semibold text-white">{formatPercent(emailStats.delivery_rate)}</div>
                      <div className="text-[10px] text-zinc-500">Delivered</div>
                    </div>
                    <div className="text-center p-2 bg-zinc-900/50">
                      <div className="text-lg font-semibold text-emerald-400">{formatPercent(emailStats.open_rate)}</div>
                      <div className="text-[10px] text-zinc-500">Opened</div>
                    </div>
                    <div className="text-center p-2 bg-zinc-900/50">
                      <div className="text-lg font-semibold text-blue-400">{formatPercent(emailStats.click_rate)}</div>
                      <div className="text-[10px] text-zinc-500">Clicked</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-zinc-600 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Industry average: ~20% open rate, ~2.5% click rate. Your rates may vary by audience.
                  </div>
                </div>
              )}

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Recent Campaigns */}
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-medium text-white">Recent Campaigns</h3>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Your latest email campaigns</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('email')}
                      className="text-[10px] text-zinc-500 hover:text-white"
                    >
                      View all
                    </button>
                  </div>
                  <div className="space-y-2">
                    {emailCampaigns.slice(0, 3).map(campaign => (
                      <button
                        key={campaign.id}
                        onClick={() => setSelectedCampaign(campaign)}
                        className="w-full flex items-center justify-between p-2 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-zinc-600" />
                          <span className="text-xs text-white truncate max-w-[180px]">{campaign.name}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </button>
                    ))}
                    {emailCampaigns.length === 0 && (
                      <div className="text-center py-4">
                        <Mail className="w-6 h-6 text-zinc-800 mx-auto mb-1" />
                        <p className="text-xs text-zinc-600">No campaigns yet</p>
                        <button
                          onClick={() => setShowNewCampaign(true)}
                          className="text-[10px] text-zinc-400 hover:text-white mt-1"
                        >
                          Create your first campaign →
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Segments */}
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-medium text-white">Customer Segments</h3>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Groups you can target with campaigns</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('segments')}
                      className="text-[10px] text-zinc-500 hover:text-white"
                    >
                      View all
                    </button>
                  </div>
                  <div className="space-y-2">
                    {segments.slice(0, 4).map(segment => (
                      <button
                        key={segment.id}
                        onClick={() => setSelectedSegment(segment)}
                        className="w-full flex items-center justify-between p-2 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: segment.color || '#71717a' }}
                          />
                          <span className="text-xs text-white truncate max-w-[180px]">{segment.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{formatNumber(segment.customer_count)} customers</span>
                      </button>
                    ))}
                    {segments.length === 0 && (
                      <div className="text-center py-4">
                        <Users className="w-6 h-6 text-zinc-800 mx-auto mb-1" />
                        <p className="text-xs text-zinc-600">No segments yet</p>
                        <p className="text-[10px] text-zinc-700 mt-1">Segments are created automatically based on customer behavior</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Sources Footer */}
              <div className="border-t border-zinc-900 pt-3 mt-2">
                <div className="flex items-center gap-4 text-[10px] text-zinc-600">
                  <span className="text-zinc-500 font-medium">Data Sources:</span>
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    website_visitors
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    orders
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    email_sends
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    customer_segments
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* EMAIL TAB */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              {/* Email Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-[10px] text-zinc-500 uppercase">Sent</span>
                  </div>
                  <div className="text-lg font-semibold text-white">{formatNumber(emailStats.total_sent)}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-[10px] text-zinc-500 uppercase">Delivered</span>
                  </div>
                  <div className="text-lg font-semibold text-white">{formatPercent(emailStats.delivery_rate)}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-[10px] text-zinc-500 uppercase">Opened</span>
                  </div>
                  <div className="text-lg font-semibold text-white">{formatPercent(emailStats.open_rate)}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MousePointer className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-[10px] text-zinc-500 uppercase">Clicked</span>
                  </div>
                  <div className="text-lg font-semibold text-white">{formatPercent(emailStats.click_rate)}</div>
                </div>
              </div>

              {/* Campaigns List */}
              <div className="bg-zinc-950 border border-zinc-900">
                <div className="flex items-center justify-between p-3 border-b border-zinc-900">
                  <h3 className="text-xs font-medium text-white">Campaigns</h3>
                  <button
                    onClick={() => setShowNewCampaign(true)}
                    className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
                  >
                    <Plus className="w-3 h-3" />
                    New
                  </button>
                </div>
                <div className="divide-y divide-zinc-900">
                  {emailCampaigns.map(campaign => (
                    <button
                      key={campaign.id}
                      onClick={() => setSelectedCampaign(campaign)}
                      className="w-full flex items-center justify-between p-3 hover:bg-zinc-900/50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white truncate">{campaign.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-0.5">
                          {campaign.subject}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        {campaign.status === 'sent' && (
                          <div className="text-right">
                            <div className="text-xs text-white">{formatNumber(campaign.total_sent)}</div>
                            <div className="text-[10px] text-zinc-600">sent</div>
                          </div>
                        )}
                        <div className="text-right">
                          <div className="text-[10px] text-zinc-500">
                            {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-700" />
                      </div>
                    </button>
                  ))}
                  {emailCampaigns.length === 0 && (
                    <div className="p-8 text-center">
                      <Mail className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                      <p className="text-xs text-zinc-600">No campaigns yet</p>
                      <button
                        onClick={() => setShowNewCampaign(true)}
                        className="mt-2 text-xs text-white hover:underline"
                      >
                        Create your first campaign
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* META TAB */}
          {activeTab === 'meta' && (
            <div className="space-y-4">
              {/* Sync Status */}
              {metaSyncResult && (
                <div className={`flex items-center gap-2 p-3 text-xs ${
                  metaSyncResult.success
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {metaSyncResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {metaSyncResult.message}
                </div>
              )}

              {/* Meta Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Spend</div>
                  <div className="text-lg font-semibold text-white">{formatCurrency(totalMetaSpend)}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Impressions</div>
                  <div className="text-lg font-semibold text-white">{formatNumber(totalMetaImpressions)}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Clicks</div>
                  <div className="text-lg font-semibold text-white">{formatNumber(metaCampaigns.reduce((s, c) => s + (c.clicks || 0), 0))}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">ROAS</div>
                  <div className="text-lg font-semibold text-white">
                    {totalMetaSpend > 0 ? `${(metaCampaigns.reduce((s, c) => s + (c.conversions || 0), 0) / totalMetaSpend).toFixed(1)}x` : '-'}
                  </div>
                </div>
              </div>

              {/* Meta Campaigns */}
              <div className="bg-zinc-950 border border-zinc-900">
                <div className="flex items-center justify-between p-3 border-b border-zinc-900">
                  <div>
                    <h3 className="text-xs font-medium text-white">Campaigns</h3>
                    {metaCampaigns.length > 0 && metaCampaigns[0].last_synced_at && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        Last synced {formatDistanceToNow(new Date(metaCampaigns[0].last_synced_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={syncMetaCampaigns}
                    disabled={syncingMeta}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-xs text-white transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingMeta ? 'animate-spin' : ''}`} />
                    {syncingMeta ? 'Syncing...' : 'Sync from Meta'}
                  </button>
                </div>
                <div className="divide-y divide-zinc-900">
                  {metaCampaigns.map(campaign => (
                    <button
                      key={campaign.id}
                      onClick={() => setSelectedMetaCampaign(campaign)}
                      className="w-full flex items-center justify-between p-3 hover:bg-zinc-900/50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white">{campaign.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 ${getStatusColor(campaign.status)}`}>
                            {campaign.effective_status || campaign.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-0.5">
                          {campaign.daily_budget ? `${formatCurrency(campaign.daily_budget)}/day` : campaign.objective?.replace('OUTCOME_', '') || 'No budget set'}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <div className="text-xs text-white">{formatNumber(campaign.impressions)}</div>
                          <div className="text-[10px] text-zinc-600">impressions</div>
                        </div>
                        <div>
                          <div className="text-xs text-white">{formatNumber(campaign.clicks)}</div>
                          <div className="text-[10px] text-zinc-600">clicks</div>
                        </div>
                        <div>
                          <div className="text-xs text-white">{formatCurrency(campaign.spend)}</div>
                          <div className="text-[10px] text-zinc-600">spent</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-700" />
                      </div>
                    </button>
                  ))}
                  {metaCampaigns.length === 0 && (
                    <div className="p-8 text-center">
                      <Target className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                      <p className="text-xs text-zinc-600">No Meta campaigns</p>
                      <p className="text-[10px] text-zinc-700 mt-1">Connect Meta Ads in Settings</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SEGMENTS TAB */}
          {activeTab === 'segments' && (
            <div className="space-y-4">
              {/* Segment Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Total Segments</div>
                  <div className="text-lg font-semibold text-white">{segments.length}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Total Customers</div>
                  <div className="text-lg font-semibold text-white">{formatNumber(segments.reduce((s, seg) => s + (seg.customer_count || 0), 0))}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Largest Segment</div>
                  <div className="text-lg font-semibold text-white truncate">
                    {segments[0]?.name || '-'}
                  </div>
                </div>
              </div>

              {/* Segments List */}
              <div className="bg-zinc-950 border border-zinc-900">
                <div className="flex items-center justify-between p-3 border-b border-zinc-900">
                  <h3 className="text-xs font-medium text-white">Customer Segments</h3>
                </div>
                <div className="divide-y divide-zinc-900">
                  {segments.map(segment => (
                    <button
                      key={segment.id}
                      onClick={() => setSelectedSegment(segment)}
                      className="w-full flex items-center justify-between p-3 hover:bg-zinc-900/50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: segment.color || '#71717a' }}
                          />
                          <span className="text-xs text-white">{segment.name}</span>
                        </div>
                        {segment.description && (
                          <div className="text-[10px] text-zinc-600 mt-0.5 truncate max-w-md">
                            {segment.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <div className="text-xs text-white">{formatNumber(segment.customer_count)}</div>
                          <div className="text-[10px] text-zinc-600">customers</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-700" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {(selectedCampaign || showNewCampaign) && (
        <CampaignModal
          campaign={selectedCampaign}
          isNew={showNewCampaign}
          segments={segments}
          onClose={() => { setSelectedCampaign(null); setShowNewCampaign(false) }}
          onSave={() => { fetchData(); setSelectedCampaign(null); setShowNewCampaign(false) }}
        />
      )}

      {selectedSegment && (
        <SegmentModal
          segment={selectedSegment}
          onClose={() => setSelectedSegment(null)}
          onEmailSegment={() => { setSelectedSegment(null); setShowNewCampaign(true) }}
        />
      )}

      {selectedMetaCampaign && (
        <MetaCampaignModal
          campaign={selectedMetaCampaign}
          onClose={() => setSelectedMetaCampaign(null)}
        />
      )}
    </div>
  )
}
