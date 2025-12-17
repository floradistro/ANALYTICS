'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useEmailSettingsStore } from '@/stores/email-settings.store'
import type { TemplateSlug } from '@/services/email.service'
import { useUsersManagementStore, ROLE_LABELS, type TeamUser } from '@/stores/users-management.store'
import { useSuppliersManagementStore, type Supplier } from '@/stores/suppliers-management.store'
import { useRegistersManagementStore, type Register, type PaymentProcessor } from '@/stores/registers-management.store'
import { supabase } from '@/lib/supabase'
import {
  Store,
  MapPin,
  CreditCard,
  Truck,
  Mail,
  Users,
  Package,
  Save,
  Loader2,
  Plus,
  ChevronRight,
  Globe,
  Building2,
  Wallet,
  Send,
  Check,
  X,
  Trash2,
  User,
  Edit3,
  FileText,
  Monitor,
  Terminal,
  Settings2,
  Database,
  Bell,
} from 'lucide-react'
import { CogsBackfill } from '@/components/admin/CogsBackfill'
// Tax rate structure for multiple taxes per location
interface TaxRate {
  id: string
  name: string
  rate: number // Stored as decimal (0.0825 = 8.25%)
}

// Extended Location type to include settings JSONB
interface LocationWithSettings {
  id: string
  vendor_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  tax_rate: number
  tax_name: string
  is_primary: boolean
  is_active: boolean
  created_at: string
  settings?: {
    tax_config?: {
      sales_tax_rate?: number
      tax_name?: string
      taxes?: TaxRate[] // Multiple tax rates
    }
  }
}

// Format tax rate for display (1 decimal place)
function formatTaxRate(rate: number): string {
  return rate.toFixed(1)
}

// =============================================================================
// SETTINGS SECTIONS
// =============================================================================

type SettingsSection =
  | 'store'
  | 'locations'
  | 'registers'
  | 'payments'
  | 'shipping'
  | 'email'
  | 'team'
  | 'suppliers'
  | 'data'

interface NavItem {
  id: SettingsSection
  label: string
  icon: React.ElementType
  description: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'store', label: 'Store', icon: Store, description: 'Business details & branding' },
  { id: 'locations', label: 'Locations', icon: MapPin, description: 'Store locations & tax rates' },
  { id: 'registers', label: 'Registers', icon: Monitor, description: 'POS registers & terminals' },
  { id: 'payments', label: 'Payments', icon: CreditCard, description: 'Payment processors' },
  { id: 'shipping', label: 'Shipping', icon: Truck, description: 'Shipping rates & rules' },
  { id: 'email', label: 'Email', icon: Mail, description: 'Notifications & templates' },
  { id: 'team', label: 'Team', icon: Users, description: 'Users & permissions' },
  { id: 'suppliers', label: 'Suppliers', icon: Package, description: 'Vendor management' },
  { id: 'data', label: 'Data Tools', icon: Database, description: 'Data backfill & maintenance' },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SettingsPage() {
  const { vendorId, setVendor } = useAuthStore()
  const [activeSection, setActiveSection] = useState<SettingsSection>('store')
  const [locations, setLocations] = useState<LocationWithSettings[]>([])
  const [vendor, setLocalVendor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [vendorLoading, setVendorLoading] = useState(true)

  useEffect(() => {
    if (vendorId) {
      loadAllData()
    }
  }, [vendorId])

  const loadAllData = async () => {
    if (!vendorId) return
    setVendorLoading(true)
    setLoading(true)

    try {
      // Fetch vendor and locations in parallel
      const [vendorResult, locationsResult] = await Promise.all([
        supabase.from('vendors').select('*').eq('id', vendorId).single(),
        supabase.from('locations').select('*').eq('vendor_id', vendorId).order('is_primary', { ascending: false })
      ])

      if (vendorResult.error) {
        console.error('[Settings] Vendor error:', vendorResult.error)
      } else {
        console.log('[Settings] Loaded vendor:', vendorResult.data)
        console.log('[Settings] Shipping config:', {
          default_shipping_cost: vendorResult.data?.default_shipping_cost,
          free_shipping_enabled: vendorResult.data?.free_shipping_enabled,
          free_shipping_threshold: vendorResult.data?.free_shipping_threshold
        })
        setLocalVendor(vendorResult.data)
        setVendor(vendorResult.data)
      }

      if (locationsResult.error) {
        console.error('[Settings] Locations error:', locationsResult.error)
      } else {
        console.log('[Settings] Loaded locations:', locationsResult.data)
        // Log tax rates specifically for debugging - check both direct columns and settings JSONB
        locationsResult.data?.forEach((loc: any) => {
          const taxFromSettings = loc.settings?.tax_config
          console.log(`[Settings] Location "${loc.name}":`, {
            direct_tax_rate: loc.tax_rate,
            direct_tax_name: loc.tax_name,
            settings_tax_config: taxFromSettings,
            effective_rate: taxFromSettings?.sales_tax_rate ?? loc.tax_rate,
            effective_name: taxFromSettings?.tax_name ?? loc.tax_name
          })
        })
        setLocations(locationsResult.data || [])
      }
    } catch (error) {
      console.error('[Settings] Failed to load data:', error)
    } finally {
      setVendorLoading(false)
      setLoading(false)
    }
  }

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
      console.log('[Settings] Refreshed locations:', data)
      setLocations(data || [])
    } catch (error) {
      console.error('[Settings] Failed to fetch locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVendorUpdate = (updatedVendor: any) => {
    setLocalVendor(updatedVendor)
    setVendor(updatedVendor)
  }

  // Show loading while waiting for vendorId from auth store
  if (!vendorId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin mx-auto" />
          <p className="text-zinc-500 text-sm mt-3">Loading settings...</p>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'store':
        return <StoreSettings vendor={vendor} vendorId={vendorId} setVendor={handleVendorUpdate} />
      case 'locations':
        return <LocationsSettings locations={locations} loading={loading} onRefresh={fetchLocations} vendorId={vendorId} />
      case 'registers':
        return <RegistersSettings vendorId={vendorId} locations={locations} />
      case 'payments':
        return <PaymentsSettings vendorId={vendorId} />
      case 'shipping':
        return <ShippingSettings vendor={vendor} vendorId={vendorId} setVendor={handleVendorUpdate} />
      case 'email':
        return <EmailSettings vendorId={vendorId} />
      case 'team':
        return <TeamSettings vendorId={vendorId} />
      case 'suppliers':
        return <SuppliersSettings vendorId={vendorId} />
      case 'data':
        return <DataToolsSettings />
      default:
        return null
    }
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* Sidebar Navigation */}
      <nav className="w-64 flex-shrink-0">
        <div className="bg-zinc-950 border border-zinc-900 p-2 sticky top-4">
          <h2 className="px-3 py-2 text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
            Settings
          </h2>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className={`text-sm font-light ${isActive ? 'text-black' : ''}`}>
                        {item.label}
                      </div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-zinc-600' : 'text-zinc-600'}`}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {renderContent()}
      </main>
    </div>
  )
}

// =============================================================================
// STORE SETTINGS
// =============================================================================

function StoreSettings({
  vendor,
  vendorId,
  setVendor,
}: {
  vendor: any
  vendorId: string | null
  setVendor: (v: any) => void
}) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
    store_name: '',
    ecommerce_url: '',
  })

  useEffect(() => {
    if (vendor) {
      console.log('[StoreSettings] Vendor loaded:', vendor)
      setFormData({
        store_name: vendor.store_name || '',
        ecommerce_url: vendor.ecommerce_url || '',
      })
    }
  }, [vendor])

  if (!vendor) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Store Settings" description="Manage your business details and branding" />
        <Card>
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin mx-auto" />
            <p className="text-zinc-500 text-sm mt-3">Loading store settings...</p>
          </div>
        </Card>
      </div>
    )
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendorId)
        .select()
        .single()

      if (error) throw error
      setVendor(data)
      setMessage({ type: 'success', text: 'Store settings saved' })
    } catch (error) {
      console.error('Failed to save:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Store Settings" description="Manage your business details and branding" />
      {message && <StatusMessage type={message.type} text={message.text} />}

      <Card>
        <CardHeader icon={Store} title="Business Information" />
        <div className="p-6 space-y-4 border-t border-zinc-900">
          <FormField label="Store Name">
            <input
              type="text"
              value={formData.store_name}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
              className="input-field"
              placeholder="Your Store Name"
            />
          </FormField>
        </div>
      </Card>

      <Card>
        <CardHeader icon={Globe} title="Online Presence" />
        <div className="p-6 space-y-4 border-t border-zinc-900">
          <FormField label="E-commerce URL" hint="Link to your online store">
            <input
              type="url"
              value={formData.ecommerce_url}
              onChange={(e) => setFormData({ ...formData, ecommerce_url: e.target.value })}
              className="input-field"
              placeholder="https://your-store.com"
            />
          </FormField>
        </div>
      </Card>

      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  )
}

// =============================================================================
// LOCATIONS SETTINGS
// =============================================================================

// Helper to get all tax rates from location
// Returns array of taxes with rates as percentage for display
function getLocationTaxes(location: LocationWithSettings): { name: string; rate: number }[] {
  const taxConfig = location.settings?.tax_config

  // Check for multiple taxes array first
  if (taxConfig?.taxes && taxConfig.taxes.length > 0) {
    return taxConfig.taxes.map(t => ({
      name: t.name,
      // Rates in taxes array might be decimal (0.07) or percentage (7.0)
      // If rate is less than 1, it's a decimal - convert to percentage
      rate: t.rate < 1 ? t.rate * 100 : t.rate
    }))
  }

  // Fallback to single tax from settings (stored as decimal like 0.07)
  if (taxConfig?.sales_tax_rate) {
    const rate = taxConfig.sales_tax_rate
    const name = taxConfig.tax_name ?? 'Sales Tax'
    // sales_tax_rate is always decimal (0.07 = 7%)
    return [{ name, rate: rate * 100 }]
  }

  // Fallback to direct columns (stored as percentage like 7.0)
  if (location.tax_rate && location.tax_rate > 0) {
    return [{
      name: location.tax_name ?? 'Sales Tax',
      rate: location.tax_rate
    }]
  }

  return []
}

// Get total effective tax rate (sum of all taxes)
function getTotalTaxRate(location: LocationWithSettings): number {
  const taxes = getLocationTaxes(location)
  return taxes.reduce((sum, t) => sum + t.rate, 0)
}

interface TaxFormItem {
  id: string
  name: string
  rate: number // Stored as percentage in form (8.25)
}

interface LocationEditForm {
  name: string
  address: string
  city: string
  state: string
  postal_code: string
  taxes: TaxFormItem[]
  is_active: boolean
}

// Generate unique ID for new tax items
const generateTaxId = () => `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Default empty form
const getEmptyForm = (): LocationEditForm => ({
  name: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  taxes: [{ id: generateTaxId(), name: 'Sales Tax', rate: 0 }],
  is_active: true,
})

function LocationsSettings({
  locations,
  loading,
  onRefresh,
  vendorId,
}: {
  locations: LocationWithSettings[]
  loading: boolean
  onRefresh: () => void
  vendorId: string | null
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editForm, setEditForm] = useState<LocationEditForm>(getEmptyForm())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleEdit = (location: LocationWithSettings) => {
    setEditingId(location.id)
    const locationTaxes = getLocationTaxes(location)
    setEditForm({
      name: location.name,
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      postal_code: location.postal_code || '',
      taxes: locationTaxes.length > 0
        ? locationTaxes.map(t => ({ id: generateTaxId(), name: t.name, rate: t.rate }))
        : [{ id: generateTaxId(), name: 'Sales Tax', rate: 0 }],
      is_active: location.is_active,
    })
  }

  const handleSave = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      // Get current location to merge settings
      const currentLocation = locations.find(l => l.id === editingId)
      const currentSettings = currentLocation?.settings || {}

      // Filter out taxes with 0 rate - keep as percentage format for taxes array
      const validTaxes = editForm.taxes
        .filter(t => t.rate > 0)
        .map(t => ({
          id: t.id,
          name: t.name,
          rate: t.rate // Store as percentage (7.0 = 7%)
        }))

      // Primary tax for backward compatibility with native app
      const primaryTax = validTaxes[0]
      const totalRate = validTaxes.reduce((sum, t) => sum + t.rate, 0)

      // Update both direct columns AND settings.tax_config for compatibility
      const { error } = await supabase.from('locations').update({
        name: editForm.name,
        address: editForm.address || null,
        city: editForm.city || null,
        state: editForm.state || null,
        postal_code: editForm.postal_code || null,
        // Direct columns - store as percentage (7.0 = 7%)
        tax_rate: totalRate,
        tax_name: primaryTax?.name || 'Sales Tax',
        is_active: editForm.is_active,
        // Native app compatibility + multiple taxes
        settings: {
          ...currentSettings,
          tax_config: {
            // Primary tax for native app - convert to decimal (0.07 = 7%)
            sales_tax_rate: primaryTax ? primaryTax.rate / 100 : 0,
            tax_name: primaryTax?.name || 'Sales Tax',
            // Multiple taxes array - store as percentage for dashboard
            taxes: validTaxes,
          }
        }
      }).eq('id', editingId)
      if (error) throw error
      setEditingId(null)
      setMessage({ type: 'success', text: 'Location updated' })
      onRefresh()
    } catch (error) {
      console.error('[LocationsSettings] Save error:', error)
      setMessage({ type: 'error', text: 'Failed to update location' })
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!vendorId) return
    setSaving(true)
    try {
      // Filter out taxes with 0 rate - keep as percentage format for taxes array
      const validTaxes = editForm.taxes
        .filter(t => t.rate > 0)
        .map(t => ({
          id: t.id,
          name: t.name,
          rate: t.rate // Store as percentage (7.0 = 7%)
        }))

      // Primary tax for backward compatibility
      const primaryTax = validTaxes[0]
      const totalRate = validTaxes.reduce((sum, t) => sum + t.rate, 0)

      const { error } = await supabase.from('locations').insert({
        vendor_id: vendorId,
        name: editForm.name || 'New Location',
        address: editForm.address || null,
        city: editForm.city || null,
        state: editForm.state || null,
        postal_code: editForm.postal_code || null,
        // Direct columns - store as percentage (7.0 = 7%)
        tax_rate: totalRate,
        tax_name: primaryTax?.name || 'Sales Tax',
        is_primary: locations.length === 0,
        is_active: true,
        // Native app compatibility + multiple taxes
        settings: {
          tax_config: {
            // Primary tax for native app - convert to decimal (0.07 = 7%)
            sales_tax_rate: primaryTax ? primaryTax.rate / 100 : 0,
            tax_name: primaryTax?.name || 'Sales Tax',
            // Multiple taxes array - store as percentage for dashboard
            taxes: validTaxes,
          }
        }
      })
      if (error) throw error
      setShowCreate(false)
      setEditForm(getEmptyForm())
      setMessage({ type: 'success', text: 'Location created' })
      onRefresh()
    } catch (error) {
      console.error('[LocationsSettings] Create error:', error)
      setMessage({ type: 'error', text: 'Failed to create location' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Locations"
        description="Manage your store locations and tax configuration"
        action={
          <button
            onClick={() => { setShowCreate(true); setEditForm(getEmptyForm()) }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 transition-colors text-sm font-light"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        }
      />

      {message && <StatusMessage type={message.type} text={message.text} />}

      {showCreate && (
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-light text-white mb-4">New Location</h3>
            <LocationForm form={editForm} setForm={setEditForm} />
            <div className="flex gap-2 pt-4 border-t border-zinc-900">
              <button onClick={() => { setShowCreate(false); setEditForm(getEmptyForm()) }} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !editForm.name} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Loading...</div>
      ) : locations.length === 0 && !showCreate ? (
        <Card><div className="p-12 text-center"><MapPin className="w-8 h-8 text-zinc-700 mx-auto mb-3" /><p className="text-zinc-500 text-sm">No locations</p></div></Card>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => (
            <Card key={location.id}>
              {editingId === location.id ? (
                <div className="p-6 space-y-4">
                  <LocationForm form={editForm} setForm={setEditForm} />
                  <div className="flex gap-2 pt-4 border-t border-zinc-900">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => handleEdit(location)} className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/50 text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-light text-white">{location.name}</span>
                        {location.is_primary && <span className="px-2 py-0.5 text-[10px] bg-slate-700/30 text-slate-300 border border-slate-600/30">Primary</span>}
                        {!location.is_active && <span className="px-2 py-0.5 text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700">Inactive</span>}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">{[location.address, location.city, location.state].filter(Boolean).join(', ') || 'No address'}</div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {(() => {
                          const taxes = getLocationTaxes(location)
                          if (taxes.length === 0) {
                            return (
                              <span className="px-2 py-0.5 text-[10px] border bg-amber-900/20 text-amber-400 border-amber-800/30">
                                No tax configured
                              </span>
                            )
                          }
                          return taxes.map((tax, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-[10px] border bg-emerald-900/20 text-emerald-400 border-emerald-800/30">
                              {formatTaxRate(tax.rate)}% {tax.name}
                            </span>
                          ))
                        })()}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function LocationForm({ form, setForm }: { form: LocationEditForm; setForm: (f: LocationEditForm) => void }) {
  const addTax = () => {
    setForm({
      ...form,
      taxes: [...form.taxes, { id: generateTaxId(), name: '', rate: 0 }]
    })
  }

  const removeTax = (id: string) => {
    if (form.taxes.length <= 1) return // Keep at least one tax row
    setForm({
      ...form,
      taxes: form.taxes.filter(t => t.id !== id)
    })
  }

  const updateTax = (id: string, field: 'name' | 'rate', value: string | number) => {
    setForm({
      ...form,
      taxes: form.taxes.map(t =>
        t.id === id ? { ...t, [field]: field === 'rate' ? (parseFloat(value as string) || 0) : value } : t
      )
    })
  }

  const totalTaxRate = form.taxes.reduce((sum, t) => sum + t.rate, 0)

  return (
    <div className="space-y-4">
      {/* Location Info */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Location Name">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Main Store" />
        </FormField>
        <FormField label="Address">
          <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
        </FormField>
        <FormField label="City">
          <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" />
        </FormField>
        <FormField label="State">
          <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input-field" placeholder="CA" />
        </FormField>
        <FormField label="Postal Code">
          <input type="text" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="input-field" />
        </FormField>
        <FormField label="Status">
          <label className="flex items-center gap-2 h-11">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
        </FormField>
      </div>

      {/* Tax Rates Section */}
      <div className="pt-4 border-t border-zinc-900">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-light text-white">Tax Rates</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Configure one or more tax rates for this location</p>
          </div>
          <button
            type="button"
            onClick={addTax}
            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white"
          >
            <Plus className="w-3 h-3" />
            Add Tax
          </button>
        </div>

        <div className="space-y-2">
          {form.taxes.map((tax, index) => (
            <div key={tax.id} className="flex items-center gap-2">
              <input
                type="text"
                value={tax.name}
                onChange={(e) => updateTax(tax.id, 'name', e.target.value)}
                className="input-field flex-1"
                placeholder={index === 0 ? 'Sales Tax' : 'Tax Name'}
              />
              <div className="relative w-24">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={tax.rate || ''}
                  onChange={(e) => updateTax(tax.id, 'rate', e.target.value)}
                  className="input-field pr-6 w-full"
                  placeholder="0.0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
              </div>
              <button
                type="button"
                onClick={() => removeTax(tax.id)}
                disabled={form.taxes.length <= 1}
                className="p-2 text-zinc-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {form.taxes.length > 1 && (
          <div className="mt-3 pt-2 border-t border-zinc-900/50 flex justify-end">
            <span className="text-xs text-zinc-400">
              Total: <span className="text-white font-medium">{formatTaxRate(totalTaxRate)}%</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// REGISTERS SETTINGS
// =============================================================================

function RegistersSettings({
  vendorId,
  locations,
}: {
  vendorId: string | null
  locations: LocationWithSettings[]
}) {
  const {
    registers,
    processorsByLocation,
    isLoading,
    loadRegisters,
    createRegister,
    updateRegister,
    deleteRegister,
    linkProcessor,
    unlinkProcessor,
  } = useRegistersManagementStore()

  const [selectedRegister, setSelectedRegister] = useState<Register | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showProcessorSelect, setShowProcessorSelect] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [registerForm, setRegisterForm] = useState({
    register_name: '',
    register_number: '',
    location_id: '',
    allow_card: true,
    allow_cash: true,
    allow_refunds: true,
    allow_voids: false,
    notes: '',
  })

  useEffect(() => {
    if (vendorId) loadRegisters(vendorId)
  }, [vendorId, loadRegisters])

  const registersByLocation = registers.reduce((acc, reg) => {
    const locationId = reg.location_id
    if (!acc[locationId]) {
      acc[locationId] = {
        location: reg.location || { id: locationId, name: 'Unknown Location' },
        registers: [],
      }
    }
    acc[locationId].registers.push(reg)
    return acc
  }, {} as Record<string, { location: { id: string; name: string }; registers: Register[] }>)

  const resetForms = () => {
    setRegisterForm({
      register_name: '',
      register_number: '',
      location_id: locations[0]?.id || '',
      allow_card: true,
      allow_cash: true,
      allow_refunds: true,
      allow_voids: false,
      notes: '',
    })
  }

  const handleSelectRegister = (register: Register) => {
    setSelectedRegister(register)
    setRegisterForm({
      register_name: register.register_name,
      register_number: register.register_number,
      location_id: register.location_id,
      allow_card: register.allow_card,
      allow_cash: register.allow_cash,
      allow_refunds: register.allow_refunds,
      allow_voids: register.allow_voids,
      notes: register.notes || '',
    })
    setShowProcessorSelect(false)
  }

  const handleCreateRegister = async () => {
    if (!vendorId || !registerForm.location_id) return
    setSaving(true)
    const result = await createRegister(vendorId, registerForm)
    setSaving(false)
    if (result.success) {
      setShowCreate(false)
      resetForms()
      setMessage({ type: 'success', text: 'Register created' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to create register' })
    }
  }

  const handleUpdateRegister = async () => {
    if (!selectedRegister) return
    setSaving(true)
    const result = await updateRegister(selectedRegister.id, registerForm)
    setSaving(false)
    if (result.success) {
      setMessage({ type: 'success', text: 'Register updated' })
      setSelectedRegister({ ...selectedRegister, ...registerForm })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update register' })
    }
  }

  const handleDeleteRegister = async () => {
    if (!selectedRegister || !confirm('Delete this register?')) return
    setSaving(true)
    const result = await deleteRegister(selectedRegister.id)
    setSaving(false)
    if (result.success) {
      setSelectedRegister(null)
      setMessage({ type: 'success', text: 'Register deleted' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete register' })
    }
  }

  const handleLinkProcessor = async (processorId: string) => {
    if (!selectedRegister) return
    setSaving(true)
    const result = await linkProcessor(selectedRegister.id, processorId)
    setSaving(false)
    if (result.success) {
      setShowProcessorSelect(false)
      setMessage({ type: 'success', text: 'Payment processor linked' })
      const processor = (processorsByLocation[selectedRegister.location_id] || []).find(p => p.id === processorId)
      setSelectedRegister({ ...selectedRegister, payment_processor_id: processorId, processor: processor || null })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to link processor' })
    }
  }

  const handleUnlinkProcessor = async () => {
    if (!selectedRegister?.processor || !confirm('Unlink payment processor?')) return
    setSaving(true)
    const result = await unlinkProcessor(selectedRegister.id)
    setSaving(false)
    if (result.success) {
      setSelectedRegister({ ...selectedRegister, payment_processor_id: null, processor: null })
      setMessage({ type: 'success', text: 'Payment processor unlinked' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to unlink processor' })
    }
  }

  if (!selectedRegister && !showCreate) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Registers"
          description="Manage POS registers and payment terminals"
          action={
            <button onClick={() => { resetForms(); setRegisterForm(f => ({ ...f, location_id: locations[0]?.id || '' })); setShowCreate(true) }} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 transition-colors text-sm font-light">
              <Plus className="w-4 h-4" />
              Add Register
            </button>
          }
        />
        {message && <StatusMessage type={message.type} text={message.text} />}
        {isLoading ? (
          <div className="text-center py-12 text-zinc-500 text-sm">Loading...</div>
        ) : registers.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <Monitor className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No registers configured</p>
              <p className="text-zinc-600 text-xs mt-1">Add a register to get started</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(registersByLocation).map(([locationId, { location, registers: regs }]) => (
              <div key={locationId}>
                <h3 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider px-1 mb-2">{location.name}</h3>
                <div className="space-y-2">
                  {regs.map((register) => (
                    <Card key={register.id}>
                      <button onClick={() => handleSelectRegister(register)} className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/50 text-left transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${register.processor ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-light text-white">{register.register_name}</span>
                              <span className="text-xs text-zinc-600">{register.register_number}</span>
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5">
                              {register.processor ? <span className="text-emerald-400/80">{register.processor.processor_name} • {register.processor.dejavoo_merchant_id}</span> : <span>No payment processor</span>}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </button>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (showCreate) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Add Register" description="Create a new POS register" action={<button onClick={() => { setShowCreate(false); resetForms() }} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>} />
        {message && <StatusMessage type={message.type} text={message.text} />}
        <Card>
          <CardHeader icon={Monitor} title="Register Details" />
          <div className="p-6 space-y-4 border-t border-zinc-900">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Register Name"><input type="text" value={registerForm.register_name} onChange={(e) => setRegisterForm({ ...registerForm, register_name: e.target.value })} className="input-field" placeholder="Register 1" /></FormField>
              <FormField label="Register Number"><input type="text" value={registerForm.register_number} onChange={(e) => setRegisterForm({ ...registerForm, register_number: e.target.value })} className="input-field" placeholder="POS-001" /></FormField>
              <FormField label="Location">
                <select value={registerForm.location_id} onChange={(e) => setRegisterForm({ ...registerForm, location_id: e.target.value })} className="input-field">
                  <option value="">Select location...</option>
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </FormField>
              <FormField label="Notes"><input type="text" value={registerForm.notes} onChange={(e) => setRegisterForm({ ...registerForm, notes: e.target.value })} className="input-field" placeholder="Optional notes..." /></FormField>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader icon={Settings2} title="Permissions" />
          <div className="border-t border-zinc-900 divide-y divide-zinc-900">
            <ToggleRow label="Accept Card" description="Allow card payments" checked={registerForm.allow_card} onChange={(v) => setRegisterForm({ ...registerForm, allow_card: v })} />
            <ToggleRow label="Accept Cash" description="Allow cash payments" checked={registerForm.allow_cash} onChange={(v) => setRegisterForm({ ...registerForm, allow_cash: v })} />
            <ToggleRow label="Allow Refunds" description="Process refunds" checked={registerForm.allow_refunds} onChange={(v) => setRegisterForm({ ...registerForm, allow_refunds: v })} />
            <ToggleRow label="Allow Voids" description="Void transactions" checked={registerForm.allow_voids} onChange={(v) => setRegisterForm({ ...registerForm, allow_voids: v })} />
          </div>
        </Card>
        <div className="flex justify-end">
          <button onClick={handleCreateRegister} disabled={saving || !registerForm.register_name || !registerForm.register_number || !registerForm.location_id} className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm font-light">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Register
          </button>
        </div>
      </div>
    )
  }

  if (!selectedRegister) return null

  return (
    <div className="space-y-6">
      <SectionHeader title={selectedRegister.register_name} description={`${selectedRegister.location?.name || 'Unknown'} • ${selectedRegister.register_number}`} action={<div className="flex items-center gap-2"><button onClick={handleDeleteRegister} className="px-3 py-2 text-sm text-red-400 hover:text-red-300">Delete</button><button onClick={() => { setSelectedRegister(null); resetForms() }} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Back</button></div>} />
      {message && <StatusMessage type={message.type} text={message.text} />}
      <Card>
        <CardHeader icon={Monitor} title="Register Details" />
        <div className="p-6 space-y-4 border-t border-zinc-900">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Register Name"><input type="text" value={registerForm.register_name} onChange={(e) => setRegisterForm({ ...registerForm, register_name: e.target.value })} className="input-field" /></FormField>
            <FormField label="Register Number"><input type="text" value={registerForm.register_number} onChange={(e) => setRegisterForm({ ...registerForm, register_number: e.target.value })} className="input-field" /></FormField>
            <FormField label="Location">
              <select value={registerForm.location_id} onChange={(e) => setRegisterForm({ ...registerForm, location_id: e.target.value })} className="input-field">
                {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </FormField>
            <FormField label="Notes"><input type="text" value={registerForm.notes} onChange={(e) => setRegisterForm({ ...registerForm, notes: e.target.value })} className="input-field" placeholder="Optional notes..." /></FormField>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader icon={Settings2} title="Permissions" />
        <div className="border-t border-zinc-900 divide-y divide-zinc-900">
          <ToggleRow label="Accept Card" description="Allow card payments" checked={registerForm.allow_card} onChange={(v) => setRegisterForm({ ...registerForm, allow_card: v })} />
          <ToggleRow label="Accept Cash" description="Allow cash payments" checked={registerForm.allow_cash} onChange={(v) => setRegisterForm({ ...registerForm, allow_cash: v })} />
          <ToggleRow label="Allow Refunds" description="Process refunds" checked={registerForm.allow_refunds} onChange={(v) => setRegisterForm({ ...registerForm, allow_refunds: v })} />
          <ToggleRow label="Allow Voids" description="Void transactions" checked={registerForm.allow_voids} onChange={(v) => setRegisterForm({ ...registerForm, allow_voids: v })} />
        </div>
      </Card>
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 border flex items-center justify-center ${selectedRegister.processor ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-zinc-900 border-zinc-800'}`}>
              <Terminal className={`w-5 h-5 ${selectedRegister.processor ? 'text-emerald-400' : 'text-zinc-600'}`} />
            </div>
            <div>
              <div className="text-sm font-light text-white">Payment Processor</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {selectedRegister.processor ? (
                  <span className="text-emerald-400/80">{selectedRegister.processor.processor_name} • Merchant: {selectedRegister.processor.dejavoo_merchant_id}</span>
                ) : 'No payment processor linked'}
              </div>
            </div>
          </div>
          {selectedRegister.processor ? (
            <button onClick={handleUnlinkProcessor} className="px-3 py-1.5 text-xs text-red-400 border border-red-900/50 hover:border-red-800 hover:text-red-300">Unlink</button>
          ) : (
            <button onClick={() => setShowProcessorSelect(!showProcessorSelect)} className="px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white">Link Processor</button>
          )}
        </div>
        {showProcessorSelect && !selectedRegister.processor && (
          <div className="p-4 border-t border-zinc-900 space-y-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Available Processors at {selectedRegister.location?.name || 'this location'}</div>
            {(() => {
              const availableProcessors = (processorsByLocation[selectedRegister.location_id] || [])
                .filter(p => p.is_active && !registers.some(r => r.payment_processor_id === p.id && r.id !== selectedRegister.id))

              if (availableProcessors.length === 0) {
                return (
                  <div className="text-center py-6 text-zinc-600 text-sm">
                    No available processors at this location.
                    <br />
                    <span className="text-xs">Create processors in the native POS app.</span>
                  </div>
                )
              }

              return (
                <div className="space-y-2">
                  {availableProcessors.map((proc) => (
                    <button
                      key={proc.id}
                      onClick={() => handleLinkProcessor(proc.id)}
                      disabled={saving}
                      className="w-full p-3 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 text-left transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-white">{proc.processor_name}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            Merchant: {proc.dejavoo_merchant_id} • V: {proc.dejavoo_v_number}
                          </div>
                        </div>
                        <span className="text-xs text-emerald-400">Link</span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })()}
            <button onClick={() => setShowProcessorSelect(false)} className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-400">Cancel</button>
          </div>
        )}
        {selectedRegister.processor && (
          <div className="p-4 border-t border-zinc-900 grid grid-cols-2 gap-4 text-xs">
            <div><span className="text-zinc-600">Merchant ID:</span> <span className="text-zinc-300">{selectedRegister.processor.dejavoo_merchant_id}</span></div>
            <div><span className="text-zinc-600">V-Number:</span> <span className="text-zinc-300">{selectedRegister.processor.dejavoo_v_number}</span></div>
            <div><span className="text-zinc-600">Auth Key:</span> <span className="text-zinc-300">{selectedRegister.processor.dejavoo_authkey ? '••••••••' : '—'}</span></div>
            <div><span className="text-zinc-600">TPN:</span> <span className="text-zinc-300">{selectedRegister.processor.dejavoo_tpn || '—'}</span></div>
            <div><span className="text-zinc-600">Store #:</span> <span className="text-zinc-300">{selectedRegister.processor.dejavoo_store_number || '—'}</span></div>
            <div><span className="text-zinc-600">Environment:</span> <span className="text-zinc-300">{selectedRegister.processor.environment}</span></div>
          </div>
        )}
      </Card>
      <SaveButton saving={saving} onClick={handleUpdateRegister} />
    </div>
  )
}

// =============================================================================
// PAYMENTS SETTINGS
// =============================================================================

interface AuthorizeNetConfig {
  id: string
  processor_name: string
  environment: 'sandbox' | 'production'
  authorizenet_api_login_id: string | null
  authorizenet_transaction_key: string | null
  authorizenet_public_client_key: string | null
  authorizenet_signature_key: string | null
  is_active: boolean
  is_ecommerce_processor: boolean
}

function PaymentsSettings({ vendorId }: { vendorId: string | null }) {
  const [authNetConfig, setAuthNetConfig] = useState<AuthorizeNetConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthNetModal, setShowAuthNetModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [authNetForm, setAuthNetForm] = useState({
    processor_name: 'E-Commerce Gateway',
    environment: 'sandbox' as 'sandbox' | 'production',
    api_login_id: '',
    transaction_key: '',
    public_client_key: '',
    signature_key: '',
  })

  useEffect(() => {
    if (!vendorId) return
    const loadAuthNetConfig = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('payment_processors')
          .select('*')
          .eq('vendor_id', vendorId)
          .eq('processor_type', 'authorizenet')
          .eq('is_ecommerce_processor', true)
          .single()
        if (data) {
          setAuthNetConfig(data)
          setAuthNetForm({
            processor_name: data.processor_name || 'E-Commerce Gateway',
            environment: data.environment || 'sandbox',
            api_login_id: data.authorizenet_api_login_id || '',
            transaction_key: data.authorizenet_transaction_key || '',
            public_client_key: data.authorizenet_public_client_key || '',
            signature_key: data.authorizenet_signature_key || '',
          })
        }
      } catch { console.log('[PaymentsSettings] No existing Authorize.net config') }
      finally { setLoading(false) }
    }
    loadAuthNetConfig()
  }, [vendorId])

  const handleSaveAuthNet = async () => {
    if (!vendorId) return
    if (!authNetForm.api_login_id.trim()) { setMessage({ type: 'error', text: 'API Login ID is required' }); return }
    if (!authNetForm.transaction_key.trim()) { setMessage({ type: 'error', text: 'Transaction Key is required' }); return }
    if (!authNetForm.public_client_key.trim()) { setMessage({ type: 'error', text: 'Public Client Key is required' }); return }

    setSaving(true)
    setMessage(null)
    try {
      const processorData = {
        vendor_id: vendorId,
        processor_type: 'authorizenet',
        processor_name: authNetForm.processor_name.trim(),
        environment: authNetForm.environment,
        authorizenet_api_login_id: authNetForm.api_login_id.trim(),
        authorizenet_transaction_key: authNetForm.transaction_key.trim(),
        authorizenet_public_client_key: authNetForm.public_client_key.trim(),
        authorizenet_signature_key: authNetForm.signature_key.trim() || null,
        is_active: true,
        is_ecommerce_processor: true,
        is_default: false,
      }

      if (authNetConfig) {
        const { data, error } = await supabase.from('payment_processors').update({ ...processorData, updated_at: new Date().toISOString() }).eq('id', authNetConfig.id).select().single()
        if (error) throw error
        setAuthNetConfig(data)
      } else {
        const { data, error } = await supabase.from('payment_processors').insert(processorData).select().single()
        if (error) throw error
        setAuthNetConfig(data)
      }
      setMessage({ type: 'success', text: 'Authorize.net configuration saved' })
      setShowAuthNetModal(false)
    } catch (err) {
      console.error('[PaymentsSettings] Save error:', err)
      setMessage({ type: 'error', text: 'Failed to save configuration' })
    } finally { setSaving(false) }
  }

  const handleDeleteAuthNet = async () => {
    if (!authNetConfig || !confirm('Remove Authorize.net configuration?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('payment_processors').delete().eq('id', authNetConfig.id)
      if (error) throw error
      setAuthNetConfig(null)
      setAuthNetForm({ processor_name: 'E-Commerce Gateway', environment: 'sandbox', api_login_id: '', transaction_key: '', public_client_key: '', signature_key: '' })
      setMessage({ type: 'success', text: 'Authorize.net configuration removed' })
      setShowAuthNetModal(false)
    } catch { setMessage({ type: 'error', text: 'Failed to remove configuration' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Payment Processing" description="Configure payment methods for in-store and online sales" />
      {message && <StatusMessage type={message.type} text={message.text} />}

      <div className="space-y-3">
        <h3 className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-1">In-Store Payments</h3>
        <Card>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center"><CreditCard className="w-5 h-5 text-zinc-500" /></div>
              <div><div className="text-sm font-light text-white">Dejavoo Terminal</div><div className="text-xs text-zinc-500 mt-0.5">Card payments via Dejavoo POS</div></div>
            </div>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-800/30">Active</span>
          </div>
        </Card>
        <Card>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center"><Wallet className="w-5 h-5 text-zinc-500" /></div>
              <div><div className="text-sm font-light text-white">Cash</div><div className="text-xs text-zinc-500 mt-0.5">Accept cash at checkout</div></div>
            </div>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-800/30">Active</span>
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-1">Online Payments</h3>
        <Card>
          {loading ? (
            <div className="p-4 flex items-center justify-center"><Loader2 className="w-5 h-5 text-zinc-500 animate-spin" /></div>
          ) : authNetConfig ? (
            <div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center"><CreditCard className="w-5 h-5 text-blue-400" /></div>
                  <div>
                    <div className="text-sm font-light text-white">{authNetConfig.processor_name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">Authorize.net • {authNetConfig.environment === 'production' ? 'Production' : 'Sandbox'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] ${authNetConfig.environment === 'production' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30' : 'bg-amber-900/30 text-amber-400 border border-amber-800/30'}`}>
                    {authNetConfig.environment === 'production' ? 'Live' : 'Test Mode'}
                  </span>
                  <button onClick={() => setShowAuthNetModal(true)} className="px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white">Edit</button>
                </div>
              </div>
              <div className="px-4 pb-4 grid grid-cols-2 gap-x-8 gap-y-1 text-xs border-t border-zinc-900 pt-3 mt-1">
                <div><span className="text-zinc-600">API Login ID:</span> <span className="text-zinc-300">{authNetConfig.authorizenet_api_login_id}</span></div>
                <div><span className="text-zinc-600">Transaction Key:</span> <span className="text-zinc-300">••••••••</span></div>
                <div><span className="text-zinc-600">Public Client Key:</span> <span className="text-zinc-300">{authNetConfig.authorizenet_public_client_key ? `${authNetConfig.authorizenet_public_client_key.slice(0, 12)}...` : '—'}</span></div>
                <div><span className="text-zinc-600">Signature Key:</span> <span className="text-zinc-300">{authNetConfig.authorizenet_signature_key ? '••••••••' : 'Not set'}</span></div>
              </div>
            </div>
          ) : (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center"><CreditCard className="w-5 h-5 text-zinc-700" /></div>
                <div><div className="text-sm font-light text-zinc-500">Authorize.net</div><div className="text-xs text-zinc-600 mt-0.5">Not configured</div></div>
              </div>
              <button onClick={() => setShowAuthNetModal(true)} className="px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white">Configure</button>
            </div>
          )}
        </Card>
        <Card>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center"><CreditCard className="w-5 h-5 text-zinc-700" /></div>
              <div><div className="text-sm font-light text-zinc-500">Stripe</div><div className="text-xs text-zinc-600 mt-0.5">Coming soon</div></div>
            </div>
            <span className="px-2 py-0.5 text-[10px] text-zinc-600 border border-zinc-800">Unavailable</span>
          </div>
        </Card>
      </div>

      {showAuthNetModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-white font-light">{authNetConfig ? 'Edit' : 'Configure'} Authorize.net</h2>
              <button onClick={() => setShowAuthNetModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <FormField label="Gateway Name" hint="Display name for this gateway">
                <input type="text" value={authNetForm.processor_name} onChange={(e) => setAuthNetForm({ ...authNetForm, processor_name: e.target.value })} className="input-field" placeholder="E-Commerce Gateway" />
              </FormField>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block mb-2">Environment</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAuthNetForm({ ...authNetForm, environment: 'sandbox' })} className={`flex-1 py-2 px-4 text-sm border transition-colors ${authNetForm.environment === 'sandbox' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>Sandbox</button>
                  <button type="button" onClick={() => setAuthNetForm({ ...authNetForm, environment: 'production' })} className={`flex-1 py-2 px-4 text-sm border transition-colors ${authNetForm.environment === 'production' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>Production</button>
                </div>
              </div>
              <FormField label="API Login ID *" hint="From Authorize.net merchant interface">
                <input type="text" value={authNetForm.api_login_id} onChange={(e) => setAuthNetForm({ ...authNetForm, api_login_id: e.target.value })} className="input-field" placeholder="Enter API Login ID" autoComplete="off" />
              </FormField>
              <FormField label="Transaction Key *" hint="Keep this secret - never expose client-side">
                <input type="password" value={authNetForm.transaction_key} onChange={(e) => setAuthNetForm({ ...authNetForm, transaction_key: e.target.value })} className="input-field" placeholder="Enter Transaction Key" autoComplete="off" />
              </FormField>
              <FormField label="Public Client Key *" hint="Required for Accept.js (client-side tokenization)">
                <input type="text" value={authNetForm.public_client_key} onChange={(e) => setAuthNetForm({ ...authNetForm, public_client_key: e.target.value })} className="input-field" placeholder="Enter Public Client Key" autoComplete="off" />
              </FormField>
              <FormField label="Signature Key" hint="Optional - for webhook validation">
                <input type="password" value={authNetForm.signature_key} onChange={(e) => setAuthNetForm({ ...authNetForm, signature_key: e.target.value })} className="input-field" placeholder="Enter Signature Key (optional)" autoComplete="off" />
              </FormField>
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-xs text-zinc-400">
                Get your credentials from the Authorize.net Merchant Interface under <span className="text-blue-400">Account → Security Settings → API Credentials & Keys</span>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
              {authNetConfig ? <button onClick={handleDeleteAuthNet} disabled={saving} className="px-4 py-2 text-sm text-red-400 hover:text-red-300 disabled:opacity-50">Remove Gateway</button> : <div />}
              <div className="flex gap-2">
                <button onClick={() => setShowAuthNetModal(false)} disabled={saving} className="px-4 py-2 text-sm text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white disabled:opacity-50">Cancel</button>
                <button onClick={handleSaveAuthNet} disabled={saving} className="px-4 py-2 text-sm bg-white text-black hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// =============================================================================
// SHIPPING SETTINGS
// =============================================================================

function ShippingSettings({ vendor, vendorId, setVendor }: { vendor: any; vendorId: string | null; setVendor: (v: any) => void }) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [shippingCost, setShippingCost] = useState('')
  const [freeShippingOn, setFreeShippingOn] = useState(false)
  const [freeThreshold, setFreeThreshold] = useState('')

  // Initialize form when vendor data arrives or changes
  useEffect(() => {
    if (vendor) {
      setShippingCost(String(vendor.default_shipping_cost ?? 0))
      setFreeShippingOn(Boolean(vendor.free_shipping_enabled))
      setFreeThreshold(String(vendor.free_shipping_threshold ?? 0))
    }
  }, [vendor?.id])

  const handleSave = async () => {
    if (!vendorId) return
    setIsSaving(true)
    setSaveMessage(null)
    setSaveError(null)

    try {
      const updateData = {
        default_shipping_cost: parseFloat(shippingCost) || 0,
        free_shipping_enabled: freeShippingOn,
        free_shipping_threshold: parseFloat(freeThreshold) || 0,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendorId)
        .select()
        .single()

      if (error) throw error

      setVendor(data)
      setSaveMessage('Shipping settings saved successfully')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Save error:', err)
      setSaveError('Failed to save shipping settings')
    } finally {
      setIsSaving(false)
    }
  }

  // Loading state
  if (!vendor) {
    return (
      <div className="space-y-6">
        <div className="border-b border-zinc-800 pb-4">
          <h2 className="text-xl font-light text-white">Shipping</h2>
          <p className="text-sm text-zinc-500 mt-1">Configure shipping rates and free shipping thresholds</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin mx-auto" />
          <p className="text-zinc-500 text-sm mt-3">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-light text-white">Shipping</h2>
        <p className="text-sm text-zinc-500 mt-1">Configure shipping rates and free shipping thresholds</p>
      </div>

      {saveMessage && (
        <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-400 px-4 py-3 text-sm">
          {saveMessage}
        </div>
      )}

      {saveError && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 text-sm">
          {saveError}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
          <Truck className="w-5 h-5 text-zinc-400" />
          <span className="text-sm font-medium text-white">Shipping Rates</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Default Shipping Cost */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Default Shipping Cost</label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">$</span>
              <input
                type="text"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-zinc-950 border border-zinc-700 px-4 py-2 text-white text-sm focus:outline-none focus:border-zinc-500"
              />
            </div>
            <p className="text-xs text-zinc-600 mt-1">Base rate for shipping orders</p>
          </div>

          {/* Free Shipping Toggle */}
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-300">Free Shipping</div>
                <div className="text-xs text-zinc-600 mt-0.5">Offer free shipping above a threshold</div>
              </div>
              <button
                type="button"
                onClick={() => setFreeShippingOn(!freeShippingOn)}
                className={`relative w-12 h-6 rounded-full transition-colors ${freeShippingOn ? 'bg-emerald-600' : 'bg-zinc-700'}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${freeShippingOn ? 'left-7' : 'left-1'}`}
                />
              </button>
            </div>
          </div>

          {/* Free Shipping Threshold */}
          {freeShippingOn && (
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Free Shipping Threshold</label>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">$</span>
                <input
                  type="text"
                  value={freeThreshold}
                  onChange={(e) => setFreeThreshold(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-zinc-950 border border-zinc-700 px-4 py-2 text-white text-sm focus:outline-none focus:border-zinc-500"
                />
              </div>
              <p className="text-xs text-zinc-600 mt-1">Orders above this amount qualify for free shipping</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
  )
}

// =============================================================================
// EMAIL SETTINGS
// =============================================================================

// Template metadata for display
const TEMPLATE_INFO: Record<string, { label: string; description: string }> = {
  receipt: { label: 'Receipt', description: 'Sent after successful payment' },
  order_confirmation: { label: 'Order Confirmation', description: 'Confirms order placement' },
  order_ready: { label: 'Order Ready', description: 'Pickup order is ready' },
  order_shipped: { label: 'Order Shipped', description: 'Order has been shipped' },
  welcome: { label: 'Welcome', description: 'New customer welcome email' },
  password_reset: { label: 'Password Reset', description: 'Password reset request' },
  team_invite: { label: 'Team Invite', description: 'New team member invitation' },
  loyalty_update: { label: 'Loyalty Update', description: 'Points earned notification' },
  back_in_stock: { label: 'Back in Stock', description: 'Product availability alert' },
  order_status_update: { label: 'Order Status', description: 'General order updates' },
}

function EmailSettings({ vendorId }: { vendorId: string | null }) {
  const { settings, isLoading, isSaving, isSendingTest, error, loadSettings, updateSettings, sendTestEmail } = useEmailSettingsStore()
  const [isEditing, setIsEditing] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
    from_name: '',
    from_email: '',
    reply_to: '',
    domain: '',
    email_header_image_url: '',
    enable_receipts: true,
    enable_order_confirmations: true,
    enable_order_updates: true,
    enable_loyalty_updates: true,
    enable_password_resets: true,
    enable_welcome_emails: true,
    enable_marketing: false,
    require_double_opt_in: false,
    // Alert settings
    slack_webhook_url: '',
    enable_failed_checkout_alerts: true,
    failed_checkout_alert_email: '',
  })

  // Template state - use hardcoded list since templates live in edge function
  const [sendingTemplateTest, setSendingTemplateTest] = useState<string | null>(null)

  // Available template slugs (templates are rendered by edge function)
  const templateSlugs = Object.keys(TEMPLATE_INFO)

  useEffect(() => { if (vendorId) loadSettings(vendorId) }, [vendorId, loadSettings])
  useEffect(() => {
    if (settings) {
      setFormData({
        from_name: settings.from_name || '',
        from_email: settings.from_email || '',
        reply_to: settings.reply_to || '',
        domain: settings.domain || '',
        email_header_image_url: settings.email_header_image_url || '',
        enable_receipts: settings.enable_receipts ?? true,
        enable_order_confirmations: settings.enable_order_confirmations ?? true,
        enable_order_updates: settings.enable_order_updates ?? true,
        enable_loyalty_updates: settings.enable_loyalty_updates ?? true,
        enable_password_resets: settings.enable_password_resets ?? true,
        enable_welcome_emails: settings.enable_welcome_emails ?? true,
        enable_marketing: settings.enable_marketing ?? false,
        require_double_opt_in: settings.require_double_opt_in ?? false,
        // Alert settings
        slack_webhook_url: settings.slack_webhook_url || '',
        enable_failed_checkout_alerts: settings.enable_failed_checkout_alerts ?? true,
        failed_checkout_alert_email: settings.failed_checkout_alert_email || '',
      })
    }
  }, [settings])

  const handleSave = async () => { if (!vendorId) return; const success = await updateSettings(vendorId, formData); if (success) { setIsEditing(false); setMessage({ type: 'success', text: 'Email settings saved' }) } else { setMessage({ type: 'error', text: error || 'Failed' }) } }
  const handleSendTest = async () => { if (!vendorId || !testEmail) return; const success = await sendTestEmail(vendorId, testEmail); setMessage(success ? { type: 'success', text: `Test sent to ${testEmail}` } : { type: 'error', text: error || 'Failed' }) }

  // Send test email for specific template
  const handleSendTemplateTest = async (templateSlug: string) => {
    if (!vendorId || !testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address first' })
      return
    }
    setSendingTemplateTest(templateSlug)
    try {
      const success = await sendTestEmail(vendorId, testEmail, templateSlug as TemplateSlug)
      const info = TEMPLATE_INFO[templateSlug]
      setMessage(success
        ? { type: 'success', text: `${info?.label || templateSlug} test sent to ${testEmail}` }
        : { type: 'error', text: error || 'Failed to send test email' }
      )
    } finally {
      setSendingTemplateTest(null)
    }
  }

  if (isLoading && !settings) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <SectionHeader title="Email & Notifications" description="Configure email sender settings" action={settings && !isEditing ? <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white">Edit</button> : null} />
      {message && <StatusMessage type={message.type} text={message.text} />}

      {!settings ? (
        <Card><div className="p-12 text-center"><Mail className="w-8 h-8 text-zinc-700 mx-auto mb-3" /><p className="text-zinc-400 text-sm mb-4">Email not configured</p><button onClick={() => vendorId && updateSettings(vendorId, { from_name: 'Your Store', from_email: 'noreply@example.com', domain: 'example.com', enable_receipts: true, enable_order_confirmations: true, enable_order_updates: true, enable_loyalty_updates: true, enable_welcome_emails: true, enable_marketing: false })} disabled={isSaving} className="px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm">{isSaving ? 'Setting up...' : 'Set Up Email'}</button></div></Card>
      ) : (
        <>
          <Card>
            <CardHeader icon={Mail} title="Sender Configuration" />
            <div className="p-6 space-y-4 border-t border-zinc-900">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="From Name"><input type="text" value={formData.from_name} onChange={(e) => setFormData({ ...formData, from_name: e.target.value })} className="input-field" /></FormField>
                    <FormField label="From Email"><input type="email" value={formData.from_email} onChange={(e) => setFormData({ ...formData, from_email: e.target.value })} className="input-field" /></FormField>
                    <FormField label="Reply-To"><input type="email" value={formData.reply_to} onChange={(e) => setFormData({ ...formData, reply_to: e.target.value })} className="input-field" /></FormField>
                    <FormField label="Domain"><input type="text" value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className="input-field" /></FormField>
                    <div className="col-span-2">
                      <FormField label="Email Header Image URL" hint="Custom logo/banner displayed at top of emails">
                        <input type="url" value={formData.email_header_image_url} onChange={(e) => setFormData({ ...formData, email_header_image_url: e.target.value })} className="input-field" placeholder="https://..." />
                      </FormField>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-zinc-900">
                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save</button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="From Name" value={settings.from_name} />
                    <InfoRow label="From Email" value={settings.from_email} />
                    <InfoRow label="Reply-To" value={settings.reply_to || '—'} />
                    <InfoRow label="Domain" value={settings.domain} verified={settings.domain_verified} />
                  </div>
                  {settings.email_header_image_url && (
                    <div className="pt-4 border-t border-zinc-900">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Email Header Image</div>
                      <img src={settings.email_header_image_url} alt="Email header" className="h-12 object-contain bg-zinc-900 border border-zinc-800 p-2" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={Send} title="Transactional Emails" />
            <div className="border-t border-zinc-900 divide-y divide-zinc-900">
              <ToggleRow label="Receipts" description="Send receipt after purchase" checked={formData.enable_receipts} onChange={(v) => setFormData({ ...formData, enable_receipts: v })} disabled={!isEditing} />
              <ToggleRow label="Order Confirmations" description="Confirm order placement" checked={formData.enable_order_confirmations} onChange={(v) => setFormData({ ...formData, enable_order_confirmations: v })} disabled={!isEditing} />
              <ToggleRow label="Order Updates" description="Shipping and status updates" checked={formData.enable_order_updates} onChange={(v) => setFormData({ ...formData, enable_order_updates: v })} disabled={!isEditing} />
              <ToggleRow label="Loyalty Updates" description="Points earned and rewards" checked={formData.enable_loyalty_updates} onChange={(v) => setFormData({ ...formData, enable_loyalty_updates: v })} disabled={!isEditing} />
              <ToggleRow label="Password Resets" description="Password reset emails" checked={formData.enable_password_resets} onChange={(v) => setFormData({ ...formData, enable_password_resets: v })} disabled={!isEditing} />
              <ToggleRow label="Welcome Emails" description="New customer welcome" checked={formData.enable_welcome_emails} onChange={(v) => setFormData({ ...formData, enable_welcome_emails: v })} disabled={!isEditing} />
            </div>
          </Card>

          <Card>
            <CardHeader icon={Mail} title="Marketing Emails" />
            <div className="border-t border-zinc-900 divide-y divide-zinc-900">
              <ToggleRow label="Marketing Emails" description="Send promotional and marketing campaigns" checked={formData.enable_marketing} onChange={(v) => setFormData({ ...formData, enable_marketing: v })} disabled={!isEditing} />
              {formData.enable_marketing && (
                <ToggleRow label="Require Double Opt-In" description="Customers must confirm subscription" checked={formData.require_double_opt_in} onChange={(v) => setFormData({ ...formData, require_double_opt_in: v })} disabled={!isEditing} />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={Bell} title="Alerts & Notifications" />
            <div className="border-t border-zinc-900">
              <div className="divide-y divide-zinc-900">
                <ToggleRow
                  label="Failed Checkout Alerts"
                  description="Get notified when a checkout fails (payment declined, error, etc.)"
                  checked={formData.enable_failed_checkout_alerts}
                  onChange={(v) => setFormData({ ...formData, enable_failed_checkout_alerts: v })}
                  disabled={!isEditing}
                />
              </div>
              {formData.enable_failed_checkout_alerts && (
                <div className="p-6 space-y-4 border-t border-zinc-900">
                  {isEditing ? (
                    <>
                      <FormField label="Slack Webhook URL" hint="Receive alerts in a Slack channel">
                        <input
                          type="url"
                          value={formData.slack_webhook_url}
                          onChange={(e) => setFormData({ ...formData, slack_webhook_url: e.target.value })}
                          className="input-field"
                          placeholder="https://hooks.slack.com/services/..."
                        />
                      </FormField>
                      <FormField label="Alert Email Override" hint="Send alerts to a different email (leave blank to use vendor email)">
                        <input
                          type="email"
                          value={formData.failed_checkout_alert_email}
                          onChange={(e) => setFormData({ ...formData, failed_checkout_alert_email: e.target.value })}
                          className="input-field"
                          placeholder="alerts@yourstore.com"
                        />
                      </FormField>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <InfoRow
                        label="Slack Webhook"
                        value={formData.slack_webhook_url ? '••••••••' + formData.slack_webhook_url.slice(-20) : 'Not configured'}
                      />
                      <InfoRow
                        label="Alert Email"
                        value={formData.failed_checkout_alert_email || 'Using default vendor email'}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={FileText} title="Email Templates" />
            <div className="border-t border-zinc-900">
              <div className="p-4">
                <p className="text-xs text-zinc-500 mb-4">
                  Send a test email using any template. Enter your email address below first.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {templateSlugs.map((slug) => {
                    const info = TEMPLATE_INFO[slug]
                    return (
                      <div
                        key={slug}
                        className="bg-zinc-900/50 border border-zinc-800 p-3 group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-light text-white truncate">
                              {info.label}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              {info.description}
                            </div>
                          </div>
                          <button
                            onClick={() => handleSendTemplateTest(slug)}
                            disabled={sendingTemplateTest === slug || !testEmail}
                            className="p-1.5 text-zinc-600 hover:text-white disabled:opacity-50 transition-colors ml-2"
                            title={testEmail ? 'Send test email' : 'Enter test email first'}
                          >
                            {sendingTemplateTest === slug ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={Send} title="Test Email" />
            <div className="p-6 border-t border-zinc-900 flex gap-3">
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="input-field flex-1" placeholder="your@email.com" />
              <button onClick={handleSendTest} disabled={isSendingTest || !testEmail} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm whitespace-nowrap">{isSendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send Test</button>
            </div>
          </Card>

        </>
      )}
    </div>
  )
}

// =============================================================================
// TEAM SETTINGS
// =============================================================================

interface LocationOption {
  id: string
  name: string
  is_active: boolean
}

function TeamSettings({ vendorId }: { vendorId: string | null }) {
  const { users, isLoading, loadUsers, createUser, updateUser, deleteUser, toggleUserStatus, updateUserLocations } = useUsersManagementStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '', role: 'pos_staff', employee_id: '', location_ids: [] as string[] })
  const [locations, setLocations] = useState<LocationOption[]>([])

  useEffect(() => { if (vendorId) loadUsers(vendorId) }, [vendorId, loadUsers])

  // Fetch locations for the vendor
  useEffect(() => {
    if (!vendorId) return
    const fetchLocations = async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, is_active')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
        .order('name')
      if (!error && data) setLocations(data)
    }
    fetchLocations()
  }, [vendorId])

  const handleCreate = async () => {
    if (!vendorId) {
      setMessage({ type: 'error', text: 'No vendor selected. Please refresh the page.' })
      return
    }
    if (!formData.email || !formData.first_name || !formData.last_name) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' })
      return
    }
    setSaving(true)
    const result = await createUser(vendorId, formData)
    setSaving(false)
    if (result.success) { setShowCreate(false); setFormData({ first_name: '', last_name: '', email: '', phone: '', role: 'pos_staff', employee_id: '', location_ids: [] }); setMessage({ type: 'success', text: result.message || 'Invitation sent! User will receive an email to set their password.' }) }
    else { setMessage({ type: 'error', text: result.error || 'Failed to create user' }) }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    setSaving(true)
    const { location_ids, ...userData } = formData
    const result = await updateUser(editingId, userData as any)
    // Update locations separately
    if (result.success) {
      await updateUserLocations(editingId, location_ids)
      if (vendorId) await loadUsers(vendorId) // Reload to get updated locations
    }
    setSaving(false)
    if (result.success) { setEditingId(null); setMessage({ type: 'success', text: 'User updated' }) }
    else { setMessage({ type: 'error', text: result.error || 'Failed' }) }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user?')) return
    const result = await deleteUser(userId)
    setMessage(result.success ? { type: 'success', text: 'User deleted' } : { type: 'error', text: result.error || 'Failed' })
  }

  const startEdit = (user: TeamUser) => {
    setEditingId(user.id)
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      employee_id: user.employee_id || '',
      location_ids: user.locations?.map(l => l.id) || []
    })
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Team" description="Manage users and permissions" action={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 text-sm font-light"><Plus className="w-4 h-4" />Add User</button>} />
      {message && <StatusMessage type={message.type} text={message.text} />}

      {showCreate && (
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-light text-white mb-4">New Team Member</h3>
            <UserForm form={formData} setForm={setFormData} locations={locations} />
            <div className="flex gap-2 pt-4 border-t border-zinc-900">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !formData.email || !formData.first_name || !formData.last_name} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add</button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? <div className="text-center py-12 text-zinc-500 text-sm">Loading...</div>
      : users.length === 0 && !showCreate ? <Card><div className="p-12 text-center"><Users className="w-8 h-8 text-zinc-700 mx-auto mb-3" /><p className="text-zinc-500 text-sm">No team members</p></div></Card>
      : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              {editingId === user.id ? (
                <div className="p-6 space-y-4">
                  <UserForm form={formData} setForm={setFormData} locations={locations} />
                  <div className="flex gap-2 pt-4 border-t border-zinc-900">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                    <button onClick={handleUpdate} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save</button>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center"><User className="w-5 h-5 text-zinc-500" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-light text-white">{user.first_name} {user.last_name}</span>
                        <span className="px-2 py-0.5 text-[10px] bg-slate-700/30 text-slate-300 border border-slate-600/30">{ROLE_LABELS[user.role] || user.role}</span>
                        {user.status === 'inactive' && <span className="px-2 py-0.5 text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700">Inactive</span>}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">{user.email}</div>
                      {user.locations && user.locations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {user.locations.map(loc => (
                            <span key={loc.id} className="px-1.5 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">{loc.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleUserStatus(user.id, user.status === 'active' ? 'inactive' : 'active')} className={`px-2 py-1 text-xs ${user.status === 'active' ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}`}>{user.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => startEdit(user)} className="p-2 text-zinc-500 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(user.id)} className="p-2 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function UserForm({ form, setForm, locations }: { form: any; setForm: (f: any) => void; locations: LocationOption[] }) {
  const toggleLocation = (locationId: string) => {
    const current = form.location_ids || []
    const updated = current.includes(locationId)
      ? current.filter((id: string) => id !== locationId)
      : [...current, locationId]
    setForm({ ...form, location_ids: updated })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="First Name"><input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input-field" /></FormField>
        <FormField label="Last Name"><input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input-field" /></FormField>
        <FormField label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></FormField>
        <FormField label="Phone"><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" /></FormField>
        <FormField label="Role">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
            <option value="vendor_owner">Owner</option>
            <option value="vendor_manager">Manager</option>
            <option value="location_manager">Location Manager</option>
            <option value="pos_staff">Staff</option>
            <option value="inventory_staff">Inventory</option>
            <option value="readonly">Read Only</option>
          </select>
        </FormField>
        <FormField label="Employee ID"><input type="text" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="input-field" placeholder="Optional" /></FormField>
      </div>
      {locations.length > 0 && (
        <div>
          <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Assigned Locations</label>
          <div className="flex flex-wrap gap-2">
            {locations.map(loc => (
              <button
                key={loc.id}
                type="button"
                onClick={() => toggleLocation(loc.id)}
                className={`px-3 py-1.5 text-xs border transition-colors ${
                  (form.location_ids || []).includes(loc.id)
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// SUPPLIERS SETTINGS
// =============================================================================

function SuppliersSettings({ vendorId }: { vendorId: string | null }) {
  const { suppliers, isLoading, loadSuppliers, createSupplier, updateSupplier, deleteSupplier, toggleSupplierStatus } = useSuppliersManagementStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({ external_name: '', contact_name: '', contact_email: '', contact_phone: '', address: '', notes: '' })

  useEffect(() => { if (vendorId) loadSuppliers(vendorId) }, [vendorId, loadSuppliers])

  const handleCreate = async () => {
    if (!vendorId) return
    setSaving(true)
    const result = await createSupplier(vendorId, formData)
    setSaving(false)
    if (result.success) { setShowCreate(false); setFormData({ external_name: '', contact_name: '', contact_email: '', contact_phone: '', address: '', notes: '' }); setMessage({ type: 'success', text: 'Supplier created' }) }
    else { setMessage({ type: 'error', text: result.error || 'Failed' }) }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    setSaving(true)
    const result = await updateSupplier(editingId, formData as any)
    setSaving(false)
    if (result.success) { setEditingId(null); setMessage({ type: 'success', text: 'Supplier updated' }) }
    else { setMessage({ type: 'error', text: result.error || 'Failed' }) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return
    const result = await deleteSupplier(id)
    setMessage(result.success ? { type: 'success', text: 'Deleted' } : { type: 'error', text: result.error || 'Failed' })
  }

  const startEdit = (s: Supplier) => {
    setEditingId(s.id)
    setFormData({ external_name: s.external_name, contact_name: s.contact_name || '', contact_email: s.contact_email || '', contact_phone: s.contact_phone || '', address: s.address || '', notes: s.notes || '' })
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Suppliers" description="Manage your product suppliers" action={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 text-sm font-light"><Plus className="w-4 h-4" />Add Supplier</button>} />
      {message && <StatusMessage type={message.type} text={message.text} />}

      {showCreate && (
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-light text-white mb-4">New Supplier</h3>
            <SupplierForm form={formData} setForm={setFormData} />
            <div className="flex gap-2 pt-4 border-t border-zinc-900">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !formData.external_name} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add</button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? <div className="text-center py-12 text-zinc-500 text-sm">Loading...</div>
      : suppliers.length === 0 && !showCreate ? <Card><div className="p-12 text-center"><Package className="w-8 h-8 text-zinc-700 mx-auto mb-3" /><p className="text-zinc-500 text-sm">No suppliers</p></div></Card>
      : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <Card key={s.id}>
              {editingId === s.id ? (
                <div className="p-6 space-y-4">
                  <SupplierForm form={formData} setForm={setFormData} />
                  <div className="flex gap-2 pt-4 border-t border-zinc-900">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                    <button onClick={handleUpdate} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save</button>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center"><Package className="w-5 h-5 text-zinc-500" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-light text-white">{s.external_name}</span>
                        {!s.is_active && <span className="px-2 py-0.5 text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700">Inactive</span>}
                      </div>
                      {s.contact_name && <div className="text-xs text-zinc-500 mt-0.5">{s.contact_name}</div>}
                      {s.contact_email && <div className="text-xs text-zinc-600 mt-0.5">{s.contact_email}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleSupplierStatus(s.id, !s.is_active)} className={`px-2 py-1 text-xs ${s.is_active ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}`}>{s.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => startEdit(s)} className="p-2 text-zinc-500 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function SupplierForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Supplier Name"><input type="text" value={form.external_name} onChange={(e) => setForm({ ...form, external_name: e.target.value })} className="input-field" placeholder="Company Name" /></FormField>
      <FormField label="Contact Name"><input type="text" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="input-field" /></FormField>
      <FormField label="Email"><input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="input-field" /></FormField>
      <FormField label="Phone"><input type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="input-field" /></FormField>
      <div className="col-span-2"><FormField label="Address"><input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" /></FormField></div>
      <div className="col-span-2"><FormField label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field min-h-[80px] resize-none" /></FormField></div>
    </div>
  )
}

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex items-start justify-between"><div><h1 className="text-xl font-light text-white tracking-wide">{title}</h1><p className="text-zinc-500 text-sm font-light mt-1">{description}</p></div>{action}</div>
}

function DataToolsSettings() {
  return (
    <div className="space-y-6">
      <CogsBackfill />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-zinc-950 border border-zinc-900">{children}</div>
}

function CardHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return <div className="flex items-center gap-3 p-4"><div className="w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center"><Icon className="w-4 h-4 text-zinc-500" /></div><h3 className="text-sm font-light text-white">{title}</h3></div>
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2">{label}</label>{children}{hint && <p className="text-[10px] text-zinc-600 mt-1.5">{hint}</p>}</div>
}

function InfoRow({ label, value, verified }: { label: string; value: string; verified?: boolean }) {
  return <div><div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</div><div className="flex items-center gap-2"><span className="text-sm font-light text-white">{value}</span>{verified !== undefined && <span className={`text-xs ${verified ? 'text-emerald-400' : 'text-amber-400'}`}>{verified ? 'Verified' : 'Not Verified'}</span>}</div></div>
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <button onClick={() => !disabled && onChange(!checked)} disabled={disabled} className={`relative w-11 h-6 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${checked ? 'bg-white' : 'bg-zinc-800'}`}><div className={`absolute top-1 w-4 h-4 transition-all ${checked ? 'left-6 bg-black' : 'left-1 bg-zinc-500'}`} /></button>
}

function ToggleRow({ label, description, checked, onChange, disabled }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <div className="flex items-center justify-between p-4"><div><div className="text-sm font-light text-white">{label}</div><div className="text-xs text-zinc-500 mt-0.5">{description}</div></div><Toggle checked={checked} onChange={onChange} disabled={disabled} /></div>
}

function StatusMessage({ type, text }: { type: 'success' | 'error'; text: string }) {
  return <div className={`flex items-center gap-2 px-4 py-3 text-sm font-light ${type === 'success' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/30' : 'bg-red-900/20 text-red-400 border border-red-800/30'}`}>{type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}{text}</div>
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return <div className="flex justify-end"><button onClick={onClick} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-sm font-light tracking-wide">{saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}</button></div>
}
