'use client'

import { X, Target, TrendingUp, MousePointer, Eye, DollarSign, Users, BarChart3, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

interface MetaCampaignModalProps {
  campaign: MetaCampaign
  onClose: () => void
}

export function MetaCampaignModal({ campaign, onClose }: MetaCampaignModalProps) {
  const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n)
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
  const formatPercent = (n: number) => `${n.toFixed(2)}%`

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'text-emerald-400 bg-emerald-400/10'
      case 'PAUSED': return 'text-amber-400 bg-amber-400/10'
      case 'DRAFT': return 'text-zinc-400 bg-zinc-400/10'
      default: return 'text-zinc-500 bg-zinc-500/10'
    }
  }

  const formatObjective = (objective: string | null) => {
    if (!objective) return '-'
    return objective
      .replace('OUTCOME_', '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  // Use Meta's validated metrics directly, fallback to calculated if not available
  const clickThroughRate = campaign.ctr ?? (campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0)
  const costPerClick = campaign.cpc ?? (campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0)
  const costPerMille = campaign.cpm ?? (campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0)
  const frequency = campaign.reach > 0 ? campaign.impressions / campaign.reach : 0

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-white">{campaign.name}</h2>
                <span className={`text-[10px] px-1.5 py-0.5 uppercase font-medium ${getStatusColor(campaign.effective_status || campaign.status)}`}>
                  {campaign.effective_status || campaign.status}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatObjective(campaign.objective)} Campaign
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Key Performance Metrics */}
          <div>
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Performance Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Spent</span>
                </div>
                <div className="text-xl font-semibold text-white">{formatCurrency(campaign.spend)}</div>
                {campaign.daily_budget && (
                  <div className="text-[10px] text-zinc-600 mt-1">
                    {formatCurrency(campaign.daily_budget)}/day budget
                  </div>
                )}
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Impressions</span>
                </div>
                <div className="text-xl font-semibold text-white">{formatNumber(campaign.impressions)}</div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  {formatCurrency(costPerMille)} CPM
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Reach</span>
                </div>
                <div className="text-xl font-semibold text-white">{formatNumber(campaign.reach)}</div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  {frequency.toFixed(2)}x frequency
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MousePointer className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Clicks</span>
                </div>
                <div className="text-xl font-semibold text-white">{formatNumber(campaign.clicks)}</div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  {formatCurrency(costPerClick)} CPC
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Metrics - from Meta API */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Engagement Metrics</h3>
              <span className="text-[10px] text-zinc-600">
                {campaign.raw_insights?.date_start && campaign.raw_insights?.date_stop
                  ? `${new Date(campaign.raw_insights.date_start).toLocaleDateString()} - ${new Date(campaign.raw_insights.date_stop).toLocaleDateString()}`
                  : 'Last 30 days'
                }
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Click-Through Rate</span>
                  <span className="text-[9px] text-blue-400/60">via Meta</span>
                </div>
                <div className="text-2xl font-semibold text-white">{formatPercent(clickThroughRate)}</div>
                <div className="mt-2 h-1.5 bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(clickThroughRate * 10, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  {clickThroughRate > 1 ? 'Above average' : 'Below average'} (avg ~1%)
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Cost Per Click</span>
                  <span className="text-[9px] text-blue-400/60">via Meta</span>
                </div>
                <div className="text-2xl font-semibold text-white">{formatCurrency(costPerClick)}</div>
                <div className="mt-2 h-1.5 bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100 - (costPerClick * 50), 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  {costPerClick < 0.50 ? 'Excellent' : costPerClick < 1 ? 'Good' : 'Consider optimizing'}
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Cost Per 1K Impr.</span>
                  <span className="text-[9px] text-blue-400/60">via Meta</span>
                </div>
                <div className="text-2xl font-semibold text-white">{formatCurrency(costPerMille)}</div>
                <div className="mt-2 h-1.5 bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${Math.min(100 - (costPerMille * 5), 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  {costPerMille < 10 ? 'Efficient reach' : 'Higher cost reach'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions Breakdown from Meta */}
          {campaign.raw_insights?.actions && campaign.raw_insights.actions.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Actions Breakdown</h3>
              <div className="bg-zinc-900/50 border border-zinc-800 p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {campaign.raw_insights.actions
                    .filter(a => ['link_click', 'landing_page_view', 'post_engagement', 'video_view', 'page_engagement', 'post_reaction', 'comment', 'like'].includes(a.action_type))
                    .sort((a, b) => parseInt(b.value) - parseInt(a.value))
                    .slice(0, 6)
                    .map(action => (
                      <div key={action.action_type} className="flex items-center justify-between p-2 bg-zinc-800/50">
                        <span className="text-[10px] text-zinc-400 capitalize">
                          {action.action_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-white font-medium">
                          {formatNumber(parseInt(action.value))}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversions (if any) */}
          {(campaign.conversions > 0 || campaign.conversion_value > 0) && (
            <div>
              <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Conversions</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Conversions</div>
                  <div className="text-2xl font-semibold text-white">{formatNumber(campaign.conversions)}</div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Conversion Value</div>
                  <div className="text-2xl font-semibold text-white">{formatCurrency(campaign.conversion_value)}</div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">ROAS</div>
                  <div className="text-2xl font-semibold text-white">
                    {campaign.roas ? `${campaign.roas.toFixed(2)}x` : '-'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Details */}
          <div>
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Campaign Details</h3>
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Campaign ID</span>
                <span className="text-xs text-white font-mono">{campaign.meta_campaign_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Objective</span>
                <span className="text-xs text-white">{formatObjective(campaign.objective)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Status</span>
                <span className={`text-xs px-1.5 py-0.5 ${getStatusColor(campaign.effective_status || campaign.status)}`}>
                  {campaign.effective_status || campaign.status}
                </span>
              </div>
              {campaign.daily_budget && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Daily Budget</span>
                  <span className="text-xs text-white">{formatCurrency(campaign.daily_budget)}</span>
                </div>
              )}
              {campaign.lifetime_budget && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Lifetime Budget</span>
                  <span className="text-xs text-white">{formatCurrency(campaign.lifetime_budget)}</span>
                </div>
              )}
              {campaign.start_time && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Started</span>
                  <span className="text-xs text-white">
                    {new Date(campaign.start_time).toLocaleDateString()}
                  </span>
                </div>
              )}
              {campaign.last_synced_at && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Last Synced</span>
                  <span className="text-xs text-zinc-400">
                    {formatDistanceToNow(new Date(campaign.last_synced_at), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-900 bg-zinc-900/30">
          <a
            href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${campaign.meta_campaign_id?.split('_')[0]}&selected_campaign_ids=${campaign.meta_campaign_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View in Meta Ads Manager
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
