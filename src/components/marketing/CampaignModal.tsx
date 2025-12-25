'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Mail, Send, Eye, MousePointer, Users, Clock, CheckCircle,
  AlertCircle, Loader2, Calendar, ChevronDown, Sparkles, Code, Monitor,
  Smartphone, Tablet, BarChart3
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { format, formatDistanceToNow } from 'date-fns'

interface EmailCampaign {
  id: string
  name: string
  subject: string
  preview_text?: string
  html_content?: string
  status: string
  total_recipients: number
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_bounced: number
  send_at: string | null
  sent_at: string | null
  created_at: string
  segment_type?: string
  target_audience?: any
}

interface Segment {
  id: string
  name: string
  customer_count: number
}

interface Props {
  campaign: EmailCampaign | null
  isNew: boolean
  segments: Segment[]
  onClose: () => void
  onSave: () => void
}

export function CampaignModal({ campaign, isNew, segments, onClose, onSave }: Props) {
  const { storeId } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'content' | 'audience'>('details')
  const [contentView, setContentView] = useState<'preview' | 'code'>('preview')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Form state
  const [name, setName] = useState(campaign?.name || '')
  const [subject, setSubject] = useState(campaign?.subject || '')
  const [previewText, setPreviewText] = useState(campaign?.preview_text || '')
  const [htmlContent, setHtmlContent] = useState(campaign?.html_content || '')
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    campaign?.target_audience?.segment_id || null
  )

  const isEditable = !campaign || campaign.status === 'draft'
  const isSent = campaign?.status === 'sent'

  const selectedSegment = segments.find(s => s.id === selectedSegmentId)

  // Update iframe when HTML content changes
  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(htmlContent)
        doc.close()
      }
    }
  }, [htmlContent, contentView, activeTab])

  const getPreviewWidth = () => {
    switch (previewDevice) {
      case 'mobile': return '375px'
      case 'tablet': return '768px'
      default: return '100%'
    }
  }

  const handleSave = async () => {
    if (!storeId || !name || !subject) return
    setSaving(true)

    try {
      const data = {
        store_id: storeId,
        name,
        subject,
        preview_text: previewText,
        html_content: htmlContent,
        status: 'draft',
        target_audience: selectedSegmentId ? { segment_id: selectedSegmentId } : null,
        total_recipients: selectedSegment?.customer_count || 0,
      }

      if (campaign) {
        await supabase.from('email_campaigns').update(data).eq('id', campaign.id)
      } else {
        await supabase.from('email_campaigns').insert(data)
      }

      onSave()
    } catch (err) {
      console.error('Save campaign error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSendNow = async () => {
    if (!campaign || !confirm(`Send "${name}" to ${selectedSegment?.customer_count || 0} customers?`)) return
    setSending(true)

    try {
      await supabase
        .from('email_campaigns')
        .update({ status: 'sending', send_now: true })
        .eq('id', campaign.id)

      const res = await fetch('/api/marketing/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id }),
      })

      if (!res.ok) throw new Error('Failed to send')

      onSave()
    } catch (err) {
      console.error('Send campaign error:', err)
      alert('Failed to send campaign')
    } finally {
      setSending(false)
    }
  }

  const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n)
  const formatPercent = (n: number, total: number) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%'

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />

      <div className="fixed inset-4 md:inset-6 lg:inset-8 bg-zinc-950 border border-zinc-900 z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-zinc-500" />
            <div>
              <h2 className="text-sm font-medium text-white">
                {isNew ? 'New Campaign' : name || 'Campaign'}
              </h2>
              {campaign && !isNew && (
                <p className="text-[10px] text-zinc-500">
                  Created {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex gap-1 px-4 border-b border-zinc-900">
          {(isSent
            ? [
                { id: 'details', label: 'Analytics' },
                { id: 'content', label: 'Preview' },
              ]
            : [
                { id: 'details', label: 'Details' },
                { id: 'content', label: 'Content' },
                { id: 'audience', label: 'Audience' },
              ]
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 text-xs border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-white'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content - fills remaining space */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Analytics Tab (sent campaigns) */}
          {isSent && activeTab === 'details' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-zinc-900/50 p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <Send className="w-4 h-4" />
                    <span className="text-[10px] uppercase">Sent</span>
                  </div>
                  <div className="text-2xl font-semibold text-white">{formatNumber(campaign.total_sent)}</div>
                </div>
                <div className="bg-zinc-900/50 p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-[10px] uppercase">Delivered</span>
                  </div>
                  <div className="text-2xl font-semibold text-white">{formatNumber(campaign.total_delivered)}</div>
                  <div className="text-[10px] text-zinc-600">{formatPercent(campaign.total_delivered, campaign.total_sent)}</div>
                </div>
                <div className="bg-zinc-900/50 p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <Eye className="w-4 h-4" />
                    <span className="text-[10px] uppercase">Opened</span>
                  </div>
                  <div className="text-2xl font-semibold text-white">{formatNumber(campaign.total_opened)}</div>
                  <div className="text-[10px] text-zinc-600">{formatPercent(campaign.total_opened, campaign.total_delivered)}</div>
                </div>
                <div className="bg-zinc-900/50 p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <MousePointer className="w-4 h-4" />
                    <span className="text-[10px] uppercase">Clicked</span>
                  </div>
                  <div className="text-2xl font-semibold text-white">{formatNumber(campaign.total_clicked)}</div>
                  <div className="text-[10px] text-zinc-600">{formatPercent(campaign.total_clicked, campaign.total_opened)}</div>
                </div>
              </div>

              {campaign.total_bounced > 0 && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  {formatNumber(campaign.total_bounced)} emails bounced
                </div>
              )}

              {/* Performance Funnel */}
              <div className="bg-zinc-900/50 p-4 mb-4">
                <h4 className="text-xs font-medium text-white mb-4">Performance Funnel</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Sent', value: campaign.total_sent, percent: 100, color: 'bg-zinc-600' },
                    { label: 'Delivered', value: campaign.total_delivered, percent: campaign.total_sent > 0 ? (campaign.total_delivered / campaign.total_sent) * 100 : 0, color: 'bg-zinc-500' },
                    { label: 'Opened', value: campaign.total_opened, percent: campaign.total_sent > 0 ? (campaign.total_opened / campaign.total_sent) * 100 : 0, color: 'bg-zinc-400' },
                    { label: 'Clicked', value: campaign.total_clicked, percent: campaign.total_sent > 0 ? (campaign.total_clicked / campaign.total_sent) * 100 : 0, color: 'bg-white' },
                  ].map(step => (
                    <div key={step.label} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-zinc-500">{step.label}</div>
                      <div className="flex-1 h-8 bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full ${step.color} flex items-center px-3 transition-all duration-500`}
                          style={{ width: `${Math.max(step.percent, 2)}%` }}
                        >
                          {step.percent > 15 && (
                            <span className="text-xs text-black font-medium">{formatNumber(step.value)}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-16 text-right text-xs text-zinc-500">{step.percent.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900/50 p-4">
                <h4 className="text-xs font-medium text-white mb-3">Campaign Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500">Subject</span>
                    <p className="text-white mt-0.5">{campaign.subject}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Sent at</span>
                    <p className="text-white mt-0.5">
                      {campaign.sent_at ? format(new Date(campaign.sent_at), 'MMM d, yyyy h:mm a') : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details Tab - Edit mode */}
          {activeTab === 'details' && !isSent && (
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 h-full">
                {/* Left column - Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditable}
                      placeholder="e.g., Holiday Sale Announcement"
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={!isEditable}
                      placeholder="e.g., Don't miss our biggest sale!"
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
                      Preview Text
                    </label>
                    <textarea
                      value={previewText}
                      onChange={(e) => setPreviewText(e.target.value)}
                      disabled={!isEditable}
                      rows={3}
                      placeholder="Text shown after subject in inbox preview"
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                {/* Right column - Summary */}
                <div className="space-y-4">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-4">
                    <h4 className="text-xs font-medium text-white mb-3">Campaign Summary</h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Status</span>
                        <span className={`px-2 py-0.5 ${campaign?.status === 'draft' ? 'text-zinc-400 bg-zinc-800' : 'text-blue-400 bg-blue-400/10'}`}>
                          {campaign?.status?.toUpperCase() || 'NEW'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Audience</span>
                        <span className="text-white">{selectedSegment?.name || 'Not selected'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Recipients</span>
                        <span className="text-white">{formatNumber(selectedSegment?.customer_count || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Has Content</span>
                        <span className={htmlContent ? 'text-emerald-400' : 'text-zinc-600'}>{htmlContent ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  {campaign && (
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4">
                      <h4 className="text-xs font-medium text-white mb-3">Timeline</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Created</span>
                          <span className="text-white">{format(new Date(campaign.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        {campaign.sent_at && (
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Sent</span>
                            <span className="text-white">{format(new Date(campaign.sent_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Content Toolbar */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-zinc-900 bg-zinc-900/30">
                {!isSent ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setContentView('preview')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                        contentView === 'preview'
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <button
                      onClick={() => setContentView('code')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                        contentView === 'code'
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      Code
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500">Email Preview</div>
                )}
                {(contentView === 'preview' || isSent) && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 transition-colors ${
                        previewDevice === 'desktop' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                      title="Desktop"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice('tablet')}
                      className={`p-1.5 transition-colors ${
                        previewDevice === 'tablet' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                      title="Tablet"
                    >
                      <Tablet className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 transition-colors ${
                        previewDevice === 'mobile' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                      title="Mobile"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {isEditable && contentView === 'code' && !isSent && (
                  <button className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-700">
                    <Sparkles className="w-3 h-3" />
                    AI Generate
                  </button>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 min-h-0 overflow-auto bg-zinc-950">
                {(contentView === 'preview' || isSent) ? (
                  <div className="h-full flex items-start justify-center p-4 bg-zinc-950">
                    {htmlContent ? (
                      <div
                        className="transition-all duration-300 shadow-2xl overflow-hidden"
                        style={{ width: getPreviewWidth(), maxWidth: '100%', height: 'calc(100% - 2rem)' }}
                      >
                        <iframe
                          ref={iframeRef}
                          className="w-full h-full border-0 bg-white"
                          title="Email Preview"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Mail className="w-12 h-12 text-zinc-800 mb-3" />
                        <p className="text-sm text-zinc-500">No email content yet</p>
                        <p className="text-xs text-zinc-600 mt-1">Switch to Code view to add HTML</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full p-4">
                    <textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      disabled={!isEditable}
                      placeholder="<!DOCTYPE html>&#10;<html>&#10;  <head>&#10;    <title>Email</title>&#10;  </head>&#10;  <body>&#10;    <!-- Your email content here -->&#10;  </body>&#10;</html>"
                      className="w-full h-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white font-mono placeholder-zinc-700 focus:border-zinc-700 focus:outline-none disabled:opacity-50 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audience Tab */}
          {activeTab === 'audience' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-auto p-4">
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                  Select Target Segment
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {segments.map(segment => (
                    <button
                      key={segment.id}
                      onClick={() => isEditable && setSelectedSegmentId(segment.id)}
                      disabled={!isEditable}
                      className={`flex items-center justify-between p-4 border transition-colors text-left ${
                        selectedSegmentId === segment.id
                          ? 'bg-zinc-900 border-white'
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-zinc-500" />
                        <div>
                          <span className="text-sm text-white block">{segment.name}</span>
                          <span className="text-[10px] text-zinc-600">
                            {formatNumber(segment.customer_count)} customers
                          </span>
                        </div>
                      </div>
                      {selectedSegmentId === segment.id && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sticky summary at bottom */}
              <div className="flex-shrink-0 p-4 border-t border-zinc-900 bg-zinc-900/30">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500">Selected Audience</span>
                    <p className="text-sm text-white mt-0.5">{selectedSegment?.name || 'None selected'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500">Recipients</span>
                    <p className="text-xl font-semibold text-white">{formatNumber(selectedSegment?.customer_count || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-zinc-900">
          <div>
            {campaign && !isNew && (
              <span className={`text-[10px] px-2 py-1 ${
                campaign.status === 'sent' ? 'text-emerald-400 bg-emerald-400/10' :
                campaign.status === 'draft' ? 'text-zinc-400 bg-zinc-400/10' :
                'text-blue-400 bg-blue-400/10'
              }`}>
                {campaign.status.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            {isEditable && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving || !name || !subject}
                  className="px-4 py-2 text-xs bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Draft
                </button>
                {campaign && selectedSegment && (
                  <button
                    onClick={handleSendNow}
                    disabled={sending || !htmlContent}
                    className="px-4 py-2 text-xs bg-white text-black hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {sending && <Loader2 className="w-3 h-3 animate-spin" />}
                    <Send className="w-3.5 h-3.5" />
                    Send Now
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
