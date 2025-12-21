'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  ArrowLeftRight,
  Search,
  ChevronDown,
  Plus,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MapPin,
} from 'lucide-react'
import { useInventoryStore, type TransferStatus } from '@/stores/inventory.store'
import { useAuthStore } from '@/stores/auth.store'
import { CreateTransferModal } from './CreateTransferModal'
import { TransferDetailModal } from './TransferDetailModal'
import { format } from 'date-fns'

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'zinc', icon: Clock },
  approved: { label: 'Approved', color: 'blue', icon: CheckCircle },
  in_transit: { label: 'In Transit', color: 'amber', icon: Truck },
  completed: { label: 'Completed', color: 'emerald', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'red', icon: XCircle },
}

export function TransfersTab() {
  const vendorId = useAuthStore((s) => s.vendorId)
  const {
    transfers,
    locations,
    isLoadingTransfers,
    loadTransfers,
    loadLocations,
    subscribeToTransfers,
    unsubscribe,
  } = useInventoryStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    if (vendorId) {
      loadLocations(vendorId)
      loadTransfers(vendorId)
      subscribeToTransfers(vendorId)
    }
    return () => unsubscribe()
  }, [vendorId])

  // Reload when filters change
  useEffect(() => {
    if (vendorId) {
      loadTransfers(vendorId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
    }
  }, [vendorId, statusFilter])

  // Filter by search
  const filteredTransfers = useMemo(() => {
    if (!searchQuery) return transfers
    const query = searchQuery.toLowerCase()
    return transfers.filter(
      (t) =>
        t.transfer_number?.toLowerCase().includes(query) ||
        t.source_location_name?.toLowerCase().includes(query) ||
        t.destination_location_name?.toLowerCase().includes(query)
    )
  }, [transfers, searchQuery])

  // Stats
  const stats = useMemo(() => {
    return {
      draft: transfers.filter((t) => t.status === 'draft').length,
      approved: transfers.filter((t) => t.status === 'approved').length,
      in_transit: transfers.filter((t) => t.status === 'in_transit').length,
      completed: transfers.filter((t) => t.status === 'completed').length,
    }
  }, [transfers])

  const getStatusBadge = (status: TransferStatus) => {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded border
          bg-${config.color}-500/10 text-${config.color}-400 border-${config.color}-500/20`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Draft
          </div>
          <div className="text-xl font-light text-white">{stats.draft}</div>
        </div>
        <div className="bg-zinc-950 border border-blue-500/30 p-4 rounded">
          <div className="text-xs text-blue-500 mb-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </div>
          <div className="text-xl font-light text-blue-400">{stats.approved}</div>
        </div>
        <div className="bg-zinc-950 border border-amber-500/30 p-4 rounded">
          <div className="text-xs text-amber-500 mb-1 flex items-center gap-1">
            <Truck className="w-3 h-3" />
            In Transit
          </div>
          <div className="text-xl font-light text-amber-400">{stats.in_transit}</div>
        </div>
        <div className="bg-zinc-950 border border-emerald-500/30 p-4 rounded">
          <div className="text-xs text-emerald-500 mb-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </div>
          <div className="text-xl font-light text-emerald-400">{stats.completed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by transfer number or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-400 hover:text-white hover:border-zinc-700"
          >
            {statusFilter === 'all' ? 'All Statuses' : STATUS_CONFIG[statusFilter].label}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded shadow-xl z-20">
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setShowStatusDropdown(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 ${
                  statusFilter === 'all' ? 'text-white bg-zinc-800' : 'text-zinc-400'
                }`}
              >
                All Statuses
              </button>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status as TransferStatus)
                    setShowStatusDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 ${
                    statusFilter === status ? 'text-white bg-zinc-800' : 'text-zinc-400'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Transfer
        </button>
      </div>

      {/* Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Transfer #
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  From
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  To
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoadingTransfers ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                      Loading transfers...
                    </div>
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <ArrowLeftRight className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No transfers found</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                    >
                      Create your first transfer
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-white">{transfer.transfer_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <MapPin className="w-3.5 h-3.5" />
                        {transfer.source_location_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <MapPin className="w-3.5 h-3.5" />
                        {transfer.destination_location_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white">{transfer.items_count || 0}</span>
                      {transfer.received_items_count !== undefined && transfer.received_items_count > 0 && (
                        <span className="text-zinc-500 ml-1">
                          ({transfer.received_items_count} received)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(transfer.status)}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {format(new Date(transfer.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedTransferId(transfer.id)}
                        className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTransferModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Detail Modal */}
      {selectedTransferId && (
        <TransferDetailModal
          isOpen={!!selectedTransferId}
          transferId={selectedTransferId}
          onClose={() => setSelectedTransferId(null)}
        />
      )}
    </div>
  )
}
