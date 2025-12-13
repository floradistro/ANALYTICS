/**
 * Email Settings Store
 * Manages vendor email configuration state
 */

import { create } from 'zustand'
import { EmailService, VendorEmailSettings, TemplateSlug } from '@/services/email.service'

interface EmailSettingsState {
  // State
  settings: VendorEmailSettings | null
  isLoading: boolean
  isSaving: boolean
  isSendingTest: boolean
  testingTemplate: TemplateSlug | null
  error: string | null

  // Actions
  loadSettings: (vendorId: string) => Promise<void>
  updateSettings: (vendorId: string, updates: Partial<VendorEmailSettings>) => Promise<boolean>
  sendTestEmail: (vendorId: string, to: string, templateSlug?: TemplateSlug) => Promise<boolean>
  clearError: () => void
  reset: () => void
}

export const useEmailSettingsStore = create<EmailSettingsState>((set) => ({
  // Initial state
  settings: null,
  isLoading: false,
  isSaving: false,
  isSendingTest: false,
  testingTemplate: null,
  error: null,

  loadSettings: async (vendorId: string) => {
    set({ isLoading: true, error: null })

    try {
      const settings = await EmailService.getVendorSettings(vendorId)
      set({ settings, isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load email settings'
      console.error('[EmailSettingsStore] Load error:', error)
      set({ error: errorMessage, isLoading: false })
    }
  },

  updateSettings: async (vendorId: string, updates: Partial<VendorEmailSettings>) => {
    set({ isSaving: true, error: null })

    try {
      const updatedSettings = await EmailService.updateVendorSettings(vendorId, updates)

      if (updatedSettings) {
        set({ settings: updatedSettings, isSaving: false })
        return true
      } else {
        throw new Error('Failed to update email settings')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update email settings'
      console.error('[EmailSettingsStore] Update error:', error)
      set({ error: errorMessage, isSaving: false })
      return false
    }
  },

  sendTestEmail: async (vendorId: string, to: string, templateSlug?: TemplateSlug) => {
    set({ isSendingTest: true, testingTemplate: templateSlug || null, error: null })

    try {
      const result = await EmailService.sendTestEmail({ vendorId, to, templateSlug })

      if (result.success) {
        set({ isSendingTest: false, testingTemplate: null })
        return true
      } else {
        throw new Error(result.error || 'Failed to send test email')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send test email'
      console.error('[EmailSettingsStore] Test email error:', error)
      set({ error: errorMessage, isSendingTest: false, testingTemplate: null })
      return false
    }
  },

  clearError: () => set({ error: null }),

  reset: () => {
    set({
      settings: null,
      isLoading: false,
      isSaving: false,
      isSendingTest: false,
      testingTemplate: null,
      error: null,
    })
  },
}))
