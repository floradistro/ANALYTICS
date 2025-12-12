'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import { Store, MapPin, Save, Loader2 } from 'lucide-react'
import type { Location } from '@/types/database'

export default function SettingsPage() {
  const { vendor, vendorId, setVendor } = useAuthStore()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
    store_name: '',
    ecommerce_url: '',
    default_shipping_cost: 0,
    free_shipping_enabled: false,
    free_shipping_threshold: 0,
  })

  useEffect(() => {
    if (vendor) {
      setFormData({
        store_name: vendor.store_name || '',
        ecommerce_url: vendor.ecommerce_url || '',
        default_shipping_cost: vendor.default_shipping_cost || 0,
        free_shipping_enabled: vendor.free_shipping_enabled || false,
        free_shipping_threshold: vendor.free_shipping_threshold || 0,
      })
    }
    if (vendorId) {
      fetchLocations()
    }
  }, [vendor, vendorId])

  const fetchLocations = async () => {
    if (!vendorId) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('is_primary', { ascending: false })

      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!vendorId) return
    setSaving(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from('vendors')
        .update({
          store_name: formData.store_name,
          ecommerce_url: formData.ecommerce_url,
          default_shipping_cost: formData.default_shipping_cost,
          free_shipping_enabled: formData.free_shipping_enabled,
          free_shipping_threshold: formData.free_shipping_threshold,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendorId)
        .select()
        .single()

      if (error) throw error

      setVendor(data)
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-light text-white tracking-wide">Settings</h1>
        <p className="text-zinc-500 text-sm font-light mt-1">Manage your store settings and preferences</p>
      </div>

      {message && (
        <div
          className={`px-4 py-3 text-sm font-light ${
            message.type === 'success'
              ? 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
              : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Store Information */}
      <div className="bg-zinc-950 border border-zinc-900 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Store className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h2 className="text-sm font-light text-white tracking-wide">Store Information</h2>
            <p className="text-xs text-zinc-500 font-light">Basic information about your store</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Store Name</label>
            <input
              type="text"
              value={formData.store_name}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">E-commerce URL</label>
            <input
              type="url"
              value={formData.ecommerce_url}
              onChange={(e) => setFormData({ ...formData, ecommerce_url: e.target.value })}
              placeholder="https://your-store.com"
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Shipping Settings */}
      <div className="bg-zinc-950 border border-zinc-900 p-6">
        <h2 className="text-sm font-light text-white tracking-wide mb-6">Shipping Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Default Shipping Cost</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.default_shipping_cost}
                onChange={(e) => setFormData({ ...formData, default_shipping_cost: parseFloat(e.target.value) || 0 })}
                className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="free_shipping"
              checked={formData.free_shipping_enabled}
              onChange={(e) => setFormData({ ...formData, free_shipping_enabled: e.target.checked })}
              className="w-4 h-4 bg-zinc-900 border-zinc-700 text-slate-400 focus:ring-emerald-500 focus:ring-offset-0 focus:ring-offset-zinc-900"
            />
            <label htmlFor="free_shipping" className="text-sm font-light text-zinc-300">
              Enable free shipping threshold
            </label>
          </div>

          {formData.free_shipping_enabled && (
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Free Shipping Threshold</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.free_shipping_threshold}
                  onChange={(e) => setFormData({ ...formData, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
              <p className="text-xs text-zinc-600 mt-2">Orders above this amount qualify for free shipping</p>
            </div>
          )}
        </div>
      </div>

      {/* Locations */}
      <div className="bg-zinc-950 border border-zinc-900 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h2 className="text-sm font-light text-white tracking-wide">Locations</h2>
            <p className="text-xs text-zinc-500 font-light">Your store locations</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-zinc-500 text-sm">Loading locations...</div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">No locations configured</div>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex items-start justify-between p-4 border border-zinc-800 bg-zinc-900/30"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-light text-white">{location.name}</h3>
                    {location.is_primary && (
                      <span className="px-2 py-0.5 text-xs font-light bg-slate-700/30 text-slate-300 border border-slate-600/30">
                        Primary
                      </span>
                    )}
                    {!location.is_active && (
                      <span className="px-2 py-0.5 text-xs font-light bg-zinc-800 text-zinc-500 border border-zinc-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  {location.address && (
                    <p className="text-sm text-zinc-500 mt-1 font-light">
                      {location.address}
                      {location.city && `, ${location.city}`}
                      {location.state && `, ${location.state}`}
                      {location.postal_code && ` ${location.postal_code}`}
                    </p>
                  )}
                  <p className="text-xs text-zinc-600 mt-1 font-light">
                    Tax: {location.tax_rate}% ({location.tax_name})
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-light tracking-wide"
        >
          {saving ? (
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
  )
}
