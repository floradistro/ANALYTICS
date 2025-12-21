'use client'

import { useState } from 'react'
import {
  X, Save, Eye, Plus, Trash2, GripVertical, Loader2,
  Package, ShoppingCart, Megaphone, ExternalLink, FileText,
  ShoppingBag, Phone, Mail, MapPin, Link as LinkIcon
} from 'lucide-react'

type QRCodeType = 'product' | 'order' | 'marketing'

interface CTAButton {
  label: string
  action: string
  url?: string
  style: 'primary' | 'secondary' | 'outline'
}

interface LandingPage {
  title: string
  description: string
  theme: 'dark' | 'light'
  // Product-specific
  show_product_info?: boolean
  show_coa?: boolean
  show_pricing?: boolean
  // Order-specific
  show_order_status?: boolean
  show_tracking?: boolean
  // Marketing-specific
  custom_content?: string
  image_url?: string
  // Shared
  cta_buttons: CTAButton[]
}

interface QRCode {
  id: string
  code: string
  type: QRCodeType
  name: string
  landing_page: LandingPage
}

interface LandingPageEditorProps {
  qrCode: QRCode
  onClose: () => void
  onSave: (landingPage: LandingPage) => void
}

const ACTION_OPTIONS = [
  { value: 'coa', label: 'View Lab Results', icon: FileText },
  { value: 'shop', label: 'Shop Online', icon: ShoppingBag },
  { value: 'url', label: 'Custom URL', icon: LinkIcon },
  { value: 'track', label: 'Track Order', icon: MapPin },
  { value: 'support', label: 'Contact Support', icon: Phone },
  { value: 'email', label: 'Email Us', icon: Mail }
]

const TYPE_CONFIG = {
  product: { icon: Package, label: 'Product', color: 'text-blue-400' },
  order: { icon: ShoppingCart, label: 'Order', color: 'text-green-400' },
  marketing: { icon: Megaphone, label: 'Marketing', color: 'text-purple-400' }
}

export function LandingPageEditor({ qrCode, onClose, onSave }: LandingPageEditorProps) {
  const [landing, setLanding] = useState<LandingPage>(qrCode.landing_page || getDefaultLanding(qrCode.type))
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'buttons' | 'preview'>('content')

  const config = TYPE_CONFIG[qrCode.type]

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(landing)
    setIsSaving(false)
  }

  const updateLanding = (updates: Partial<LandingPage>) => {
    setLanding(prev => ({ ...prev, ...updates }))
  }

  const addButton = () => {
    const newButton: CTAButton = { label: 'New Button', action: 'url', url: '', style: 'secondary' }
    updateLanding({ cta_buttons: [...landing.cta_buttons, newButton] })
  }

  const updateButton = (index: number, updates: Partial<CTAButton>) => {
    const buttons = [...landing.cta_buttons]
    buttons[index] = { ...buttons[index], ...updates }
    updateLanding({ cta_buttons: buttons })
  }

  const removeButton = (index: number) => {
    updateLanding({ cta_buttons: landing.cta_buttons.filter((_, i) => i !== index) })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex z-50">
      {/* Editor Panel */}
      <div className="w-[500px] bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <config.icon className={`w-5 h-5 ${config.color}`} />
            <div>
              <h2 className="text-lg font-medium text-white">Edit Landing Page</h2>
              <p className="text-xs text-zinc-500">{qrCode.name} ({qrCode.code})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {(['content', 'buttons', 'preview'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-slate-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'content' && (
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Page Title</label>
                <input
                  type="text"
                  value={landing.title}
                  onChange={(e) => updateLanding({ title: e.target.value })}
                  placeholder="Welcome"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
                <textarea
                  value={landing.description}
                  onChange={(e) => updateLanding({ description: e.target.value })}
                  placeholder="Brief description shown on the landing page"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
                />
              </div>

              {/* Type-specific options */}
              {qrCode.type === 'product' && (
                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <p className="text-sm text-zinc-400 mb-3">Product Display Options</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={landing.show_product_info !== false}
                      onChange={(e) => updateLanding({ show_product_info: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-slate-500 focus:ring-slate-500"
                    />
                    <span className="text-sm text-zinc-300">Show product name and details</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={landing.show_coa !== false}
                      onChange={(e) => updateLanding({ show_coa: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-slate-500 focus:ring-slate-500"
                    />
                    <span className="text-sm text-zinc-300">Show COA / Lab results button</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={landing.show_pricing === true}
                      onChange={(e) => updateLanding({ show_pricing: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-slate-500 focus:ring-slate-500"
                    />
                    <span className="text-sm text-zinc-300">Show pricing information</span>
                  </label>
                </div>
              )}

              {qrCode.type === 'order' && (
                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <p className="text-sm text-zinc-400 mb-3">Order Display Options</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={landing.show_order_status !== false}
                      onChange={(e) => updateLanding({ show_order_status: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-slate-500 focus:ring-slate-500"
                    />
                    <span className="text-sm text-zinc-300">Show order status</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={landing.show_tracking !== false}
                      onChange={(e) => updateLanding({ show_tracking: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-slate-500 focus:ring-slate-500"
                    />
                    <span className="text-sm text-zinc-300">Show tracking information</span>
                  </label>
                </div>
              )}

              {qrCode.type === 'marketing' && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <p className="text-sm text-zinc-400">Marketing Content</p>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Image URL (optional)</label>
                    <input
                      type="url"
                      value={landing.image_url || ''}
                      onChange={(e) => updateLanding({ image_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Custom HTML Content</label>
                    <textarea
                      value={landing.custom_content || ''}
                      onChange={(e) => updateLanding({ custom_content: e.target.value })}
                      placeholder="<p>Your custom content here...</p>"
                      rows={5}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none resize-none font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Theme */}
              <div className="pt-4 border-t border-zinc-800">
                <label className="block text-sm text-zinc-400 mb-2">Theme</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateLanding({ theme: 'dark' })}
                    className={`flex-1 px-4 py-3 border transition-colors ${
                      landing.theme === 'dark'
                        ? 'bg-zinc-950 border-slate-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="block text-sm">Dark</span>
                  </button>
                  <button
                    onClick={() => updateLanding({ theme: 'light' })}
                    className={`flex-1 px-4 py-3 border transition-colors ${
                      landing.theme === 'light'
                        ? 'bg-white border-slate-500 text-black'
                        : 'bg-zinc-200 border-zinc-300 text-zinc-600 hover:border-zinc-400'
                    }`}
                  >
                    <span className="block text-sm">Light</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'buttons' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Call-to-Action Buttons</p>
                <button
                  onClick={addButton}
                  disabled={landing.cta_buttons.length >= 4}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Button
                </button>
              </div>

              <div className="space-y-3">
                {landing.cta_buttons.map((btn, index) => (
                  <div key={index} className="bg-zinc-950 border border-zinc-800 p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <GripVertical className="w-4 h-4 text-zinc-600 mt-2 cursor-grab" />
                      <div className="flex-1 space-y-3">
                        {/* Label */}
                        <input
                          type="text"
                          value={btn.label}
                          onChange={(e) => updateButton(index, { label: e.target.value })}
                          placeholder="Button Label"
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none text-sm"
                        />

                        {/* Action */}
                        <select
                          value={btn.action}
                          onChange={(e) => updateButton(index, { action: e.target.value })}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white focus:border-zinc-600 focus:outline-none text-sm"
                        >
                          {ACTION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>

                        {/* URL (for custom) */}
                        {btn.action === 'url' && (
                          <input
                            type="url"
                            value={btn.url || ''}
                            onChange={(e) => updateButton(index, { url: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none text-sm"
                          />
                        )}

                        {/* Style */}
                        <div className="flex gap-2">
                          {(['primary', 'secondary', 'outline'] as const).map(style => (
                            <button
                              key={style}
                              onClick={() => updateButton(index, { style })}
                              className={`flex-1 px-2 py-1.5 text-xs capitalize transition-colors ${
                                btn.style === style
                                  ? style === 'primary'
                                    ? 'bg-slate-600 text-white'
                                    : style === 'secondary'
                                    ? 'bg-zinc-700 text-white'
                                    : 'border border-zinc-500 text-zinc-300'
                                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => removeButton(index)}
                        className="text-zinc-600 hover:text-red-400 transition-colors mt-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {landing.cta_buttons.length === 0 && (
                  <div className="text-center py-8 text-zinc-600">
                    <p className="mb-2">No buttons configured</p>
                    <button
                      onClick={addButton}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Add your first button
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="text-center text-zinc-500 py-8">
              <Eye className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>Preview shown on the right</p>
              <a
                href={`https://floradistro.com/qr/${qrCode.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Open live preview
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 bg-zinc-950 flex items-center justify-center p-8">
        <div className="w-[375px] h-[667px] bg-black border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Phone Frame */}
          <div className="h-full flex flex-col">
            {/* Status Bar */}
            <div className="h-12 bg-zinc-900 flex items-center justify-center">
              <div className="w-20 h-6 bg-black rounded-full" />
            </div>

            {/* Content */}
            <div className={`flex-1 overflow-y-auto ${landing.theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>
              <div className="p-6 space-y-6">
                {/* Logo placeholder */}
                <div className="flex justify-center">
                  <div className={`w-16 h-16 rounded-full ${landing.theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'} flex items-center justify-center`}>
                    <config.icon className={`w-8 h-8 ${config.color}`} />
                  </div>
                </div>

                {/* Title & Description */}
                <div className="text-center">
                  <h1 className={`text-xl font-semibold ${landing.theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {landing.title || 'Page Title'}
                  </h1>
                  <p className={`mt-2 text-sm ${landing.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {landing.description || 'Page description goes here'}
                  </p>
                </div>

                {/* Type-specific content preview */}
                {qrCode.type === 'product' && landing.show_product_info !== false && (
                  <div className={`p-4 rounded-lg ${landing.theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-16 h-16 rounded ${landing.theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                      <div>
                        <p className={`font-medium ${landing.theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          {qrCode.name}
                        </p>
                        <p className={`text-sm ${landing.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          Product details
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {qrCode.type === 'marketing' && landing.image_url && (
                  <div className="rounded-lg overflow-hidden">
                    <img src={landing.image_url} alt="" className="w-full h-40 object-cover" />
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="space-y-3 pt-4">
                  {landing.cta_buttons.map((btn, i) => (
                    <button
                      key={i}
                      className={`w-full py-3 px-4 text-sm font-medium transition-colors ${
                        btn.style === 'primary'
                          ? 'bg-slate-600 text-white hover:bg-slate-500'
                          : btn.style === 'secondary'
                          ? landing.theme === 'dark'
                            ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                            : 'bg-zinc-200 text-black hover:bg-zinc-300'
                          : landing.theme === 'dark'
                          ? 'border border-zinc-700 text-white hover:bg-zinc-800'
                          : 'border border-zinc-300 text-black hover:bg-zinc-100'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Home indicator */}
            <div className={`h-8 ${landing.theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} flex items-center justify-center`}>
              <div className={`w-32 h-1 rounded-full ${landing.theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getDefaultLanding(type: QRCodeType): LandingPage {
  switch (type) {
    case 'product':
      return {
        title: 'Product Details',
        description: 'View product information and lab results',
        show_product_info: true,
        show_coa: true,
        cta_buttons: [
          { label: 'View Lab Results', action: 'coa', style: 'primary' },
          { label: 'Shop Online', action: 'shop', style: 'secondary' }
        ],
        theme: 'dark'
      }
    case 'order':
      return {
        title: 'Order Status',
        description: 'Track your order',
        show_order_status: true,
        show_tracking: true,
        cta_buttons: [
          { label: 'Track Order', action: 'track', style: 'primary' },
          { label: 'Contact Support', action: 'support', style: 'secondary' }
        ],
        theme: 'dark'
      }
    case 'marketing':
      return {
        title: 'Welcome',
        description: 'Thanks for scanning!',
        custom_content: '',
        cta_buttons: [
          { label: 'Learn More', action: 'url', url: '', style: 'primary' }
        ],
        theme: 'dark'
      }
  }
}
