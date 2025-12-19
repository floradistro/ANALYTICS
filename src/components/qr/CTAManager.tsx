'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Trash2, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface CTA {
  id?: string
  label: string
  url: string
  icon?: string
  style?: string
  color?: string
  type: string
  category?: string
  thumbnail_url?: string
  description?: string
  requires_age_verification?: boolean
  compliance_warning?: string
  license_display?: string
  display_order?: number
  auto_reorder?: boolean
  is_featured?: boolean
  is_visible?: boolean
  active_from?: string
  active_until?: string
  active_days_of_week?: number[]
  active_hours_range?: string
  show_in_cities?: string[]
  hide_in_cities?: string[]
  show_in_regions?: string[]
  total_clicks?: number
  unique_clicks?: number
}

interface CTAManagerProps {
  qrCodeId: string
  qrCodeName: string
  onClose: () => void
}

const CTA_TYPES = [
  { value: 'url', label: 'Web Link' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'Text Message' },
  { value: 'app_link', label: 'App Deep Link' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF Document' },
]

const CTA_CATEGORIES = [
  { value: 'shop', label: 'Shop' },
  { value: 'info', label: 'Info' },
  { value: 'social', label: 'Social Media' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'support', label: 'Support' },
  { value: 'navigate', label: 'Navigate' },
]

const CTA_STYLES = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'link', label: 'Link' },
]

const COMMON_ICONS = [
  'shopping-cart', 'flask', 'book', 'map-pin', 'phone', 'mail',
  'message-circle', 'play-circle', 'file-text', 'external-link',
  'instagram', 'facebook', 'twitter', 'info', 'help-circle'
]

export function CTAManager({ qrCodeId, qrCodeName, onClose }: CTAManagerProps) {
  const [ctas, setCtas] = useState<CTA[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState<string | null>(null)

  const [newCTA, setNewCTA] = useState<CTA>({
    label: '',
    url: '',
    type: 'url',
    style: 'primary',
    category: 'shop',
    is_visible: true,
    display_order: 0,
  })

  useEffect(() => {
    loadCTAs()
  }, [qrCodeId])

  const loadCTAs = async () => {
    try {
      const response = await fetch(`/api/qr/ctas?qr_code_id=${qrCodeId}`)
      if (response.ok) {
        const data = await response.json()
        setCtas(data.ctas || [])
      }
    } catch (error) {
      console.error('Error loading CTAs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCTA = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/qr/ctas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code_id: qrCodeId,
          ...newCTA,
        }),
      })

      if (response.ok) {
        setNewCTA({
          label: '',
          url: '',
          type: 'url',
          style: 'primary',
          category: 'shop',
          is_visible: true,
          display_order: ctas.length,
        })
        loadCTAs()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating CTA:', error)
      alert('Failed to create CTA')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCTA = async (id: string, updates: Partial<CTA>) => {
    setSaving(true)
    try {
      const response = await fetch('/api/qr/ctas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      if (response.ok) {
        loadCTAs()
        setEditingId(null)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating CTA:', error)
      alert('Failed to update CTA')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCTA = async (id: string) => {
    if (!confirm('Are you sure you want to delete this CTA?')) return

    try {
      const response = await fetch(`/api/qr/ctas?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadCTAs()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting CTA:', error)
      alert('Failed to delete CTA')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
          <div>
            <h2 className="text-xl font-light text-white">Manage CTAs</h2>
            <p className="text-sm text-zinc-500 mt-1">{qrCodeName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {/* Existing CTAs */}
              <div className="mb-8">
                <h3 className="text-sm font-medium text-white mb-4">
                  Existing CTAs ({ctas.length})
                </h3>

                {ctas.length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 bg-zinc-950 border border-zinc-800">
                    <p className="text-sm">No CTAs yet. Create your first one below.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ctas.map((cta) => (
                      <div
                        key={cta.id}
                        className="bg-zinc-950 border border-zinc-800 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-white">{cta.label}</span>
                              <span className="text-xs px-2 py-1 bg-zinc-900 text-zinc-500 border border-zinc-800">
                                {cta.type}
                              </span>
                              {cta.category && (
                                <span className="text-xs px-2 py-1 bg-blue-950/50 text-blue-400 border border-blue-900">
                                  {cta.category}
                                </span>
                              )}
                              {cta.is_featured && (
                                <span className="text-xs px-2 py-1 bg-yellow-950/50 text-yellow-400 border border-yellow-900">
                                  Featured
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-600 font-mono mb-2">{cta.url}</div>
                            {cta.description && (
                              <div className="text-xs text-zinc-500 mb-2">{cta.description}</div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-zinc-600">
                              <span>{cta.total_clicks || 0} clicks</span>
                              <span>{cta.unique_clicks || 0} unique</span>
                              <span>Order: {cta.display_order}</span>
                              {cta.auto_reorder && <span className="text-blue-400">Auto-reorder</span>}
                            </div>

                            {/* Advanced Options Toggle */}
                            {(cta.active_from || cta.active_until || cta.show_in_cities || cta.active_hours_range) && (
                              <button
                                onClick={() => setShowAdvanced(showAdvanced === cta.id ? null : cta.id!)}
                                className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                              >
                                {showAdvanced === cta.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {showAdvanced === cta.id ? 'Hide' : 'Show'} Advanced Settings
                              </button>
                            )}

                            {showAdvanced === cta.id && (
                              <div className="mt-3 p-3 bg-zinc-900 border border-zinc-800 text-xs space-y-2">
                                {cta.active_from && (
                                  <div><span className="text-zinc-500">Active from:</span> <span className="text-white">{new Date(cta.active_from).toLocaleDateString()}</span></div>
                                )}
                                {cta.active_until && (
                                  <div><span className="text-zinc-500">Active until:</span> <span className="text-white">{new Date(cta.active_until).toLocaleDateString()}</span></div>
                                )}
                                {cta.show_in_cities && cta.show_in_cities.length > 0 && (
                                  <div><span className="text-zinc-500">Show in cities:</span> <span className="text-white">{cta.show_in_cities.join(', ')}</span></div>
                                )}
                                {cta.hide_in_cities && cta.hide_in_cities.length > 0 && (
                                  <div><span className="text-zinc-500">Hide in cities:</span> <span className="text-white">{cta.hide_in_cities.join(', ')}</span></div>
                                )}
                                {cta.show_in_regions && cta.show_in_regions.length > 0 && (
                                  <div><span className="text-zinc-500">Show in regions:</span> <span className="text-white">{cta.show_in_regions.join(', ')}</span></div>
                                )}
                                {cta.active_hours_range && (
                                  <div><span className="text-zinc-500">Active hours:</span> <span className="text-white">{cta.active_hours_range}</span></div>
                                )}
                                {cta.active_days_of_week && cta.active_days_of_week.length > 0 && (
                                  <div><span className="text-zinc-500">Active days:</span> <span className="text-white">{cta.active_days_of_week.join(', ')}</span></div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleUpdateCTA(cta.id!, { is_visible: !cta.is_visible })}
                              className={`px-3 py-1 text-xs transition-colors ${
                                cta.is_visible
                                  ? 'bg-green-950/50 text-green-400 border border-green-900 hover:bg-green-900/50'
                                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700'
                              }`}
                            >
                              {cta.is_visible ? 'Visible' : 'Hidden'}
                            </button>
                            <button
                              onClick={() => handleDeleteCTA(cta.id!)}
                              className="p-2 text-red-400 hover:bg-red-950/50 border border-zinc-800 hover:border-red-900 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create New CTA */}
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-sm font-medium text-white mb-4">Add New CTA</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-2">Label*</label>
                    <input
                      type="text"
                      value={newCTA.label}
                      onChange={(e) => setNewCTA({ ...newCTA, label: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                      placeholder="e.g., View Lab Results"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-2">URL*</label>
                    <input
                      type="text"
                      value={newCTA.url}
                      onChange={(e) => setNewCTA({ ...newCTA, url: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                      placeholder="https://... or /path"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-2">Type*</label>
                    <select
                      value={newCTA.type}
                      onChange={(e) => setNewCTA({ ...newCTA, type: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                    >
                      {CTA_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-2">Category</label>
                    <select
                      value={newCTA.category}
                      onChange={(e) => setNewCTA({ ...newCTA, category: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                    >
                      {CTA_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-2">Style</label>
                    <select
                      value={newCTA.style}
                      onChange={(e) => setNewCTA({ ...newCTA, style: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                    >
                      {CTA_STYLES.map((style) => (
                        <option key={style.value} value={style.value}>{style.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-2">Icon (optional)</label>
                    <input
                      type="text"
                      value={newCTA.icon}
                      onChange={(e) => setNewCTA({ ...newCTA, icon: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                      placeholder="e.g., shopping-cart"
                      list="icon-suggestions"
                    />
                    <datalist id="icon-suggestions">
                      {COMMON_ICONS.map(icon => (
                        <option key={icon} value={icon} />
                      ))}
                    </datalist>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs text-zinc-400 mb-2">Description (optional)</label>
                    <textarea
                      value={newCTA.description}
                      onChange={(e) => setNewCTA({ ...newCTA, description: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Subtitle or description text"
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={newCTA.is_featured}
                        onChange={(e) => setNewCTA({ ...newCTA, is_featured: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Featured (always show at top)
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={newCTA.auto_reorder}
                        onChange={(e) => setNewCTA({ ...newCTA, auto_reorder: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Auto-reorder by clicks
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={newCTA.requires_age_verification}
                        onChange={(e) => setNewCTA({ ...newCTA, requires_age_verification: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Require age verification
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCreateCTA}
                    disabled={!newCTA.label || !newCTA.url || !newCTA.type || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add CTA
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
