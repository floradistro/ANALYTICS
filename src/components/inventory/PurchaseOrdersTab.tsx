'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { usePurchaseOrdersStore, type PurchaseOrderStatus } from '@/stores/purchase-orders.store'
import { useSuppliersManagementStore } from '@/stores/suppliers-management.store'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  FileText,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react'
import { PODetailModal } from '@/components/purchase-orders/PODetailModal'
import { CreatePOModal } from '@/components/inventory/CreatePOModal'

type StatusFilter = PurchaseOrderStatus | 'all'

export function PurchaseOrdersTab() {
  const { vendorId } = useAuthStore()
  const {
    purchaseOrders,
    stats,
    isLoading,
    statusFilter,
    setStatusFilter,
    loadPurchaseOrders,
    deletePO,
    subscribe,
    unsubscribe,
  } = usePurchaseOrdersStore()
  const { suppliers, loadSuppliers } = useSuppliersManagementStore()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const pageSize = 20

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Load data
  useEffect(() => {
    if (vendorId) {
      loadPurchaseOrders(vendorId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        supplierId: supplierFilter === 'all' ? undefined : supplierFilter,
      })
      loadSuppliers(vendorId)
      subscribe(vendorId)
    }

    return () => unsubscribe()
  }, [vendorId, statusFilter, supplierFilter])

  // Reload after create
  const handlePOCreated = () => {
    if (vendorId) {
      loadPurchaseOrders(vendorId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        supplierId: supplierFilter === 'all' ? undefined : supplierFilter,
      })
    }
  }

  // Delete handler
  const handleDelete = async (e: React.MouseEvent, poId: string, poNumber: string) => {
    e.stopPropagation()

    if (!confirm(`Delete ${poNumber}? This cannot be undone.`)) return

    setDeletingId(poId)
    const result = await deletePO(poId)
    setDeletingId(null)

    if (!result.success) {
      alert(result.error || 'Failed to delete purchase order')
    }
  }

  // Filter by search locally
  const filteredPOs = purchaseOrders.filter((po) => {
    if (!debouncedSearch) return true
    const searchLower = debouncedSearch.toLowerCase()
    return (
      po.po_number.toLowerCase().includes(searchLower) ||
      (po.supplier_name || '').toLowerCase().includes(searchLower) ||
      (po.location_name || '').toLowerCase().includes(searchLower)
    )
  })

  const paginatedPOs = filteredPOs.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(filteredPOs.length / pageSize)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const exportPOs = () => {
    const csv = [
      ['PO #', 'Type', 'Supplier', 'Location', 'Status', 'Total', 'Expected Date', 'Created'].join(','),
      ...filteredPOs.map((po) =>
        [
          po.po_number,
          po.po_type,
          po.supplier_name || '',
          po.location_name || '',
          po.status,
          po.total_amount,
          po.expected_delivery_date || '',
          po.created_at ? format(new Date(po.created_at), 'yyyy-MM-dd') : '',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `purchase-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-zinc-500/10 text-zinc-400',
      pending: 'bg-amber-500/10 text-amber-400',
      ordered: 'bg-blue-500/10 text-blue-400',
      approved: 'bg-blue-500/10 text-blue-400',
      receiving: 'bg-purple-500/10 text-purple-400',
      partially_received: 'bg-purple-500/10 text-purple-400',
      received: 'bg-emerald-500/10 text-emerald-400',
      cancelled: 'bg-red-500/10 text-red-400',
    }
    return styles[status] || 'bg-zinc-800 text-zinc-400'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      pending: 'Pending',
      ordered: 'Ordered',
      approved: 'Approved',
      receiving: 'Receiving',
      partially_received: 'Partial',
      received: 'Received',
      cancelled: 'Cancelled',
    }
    return labels[status] || status
  }

  const canDelete = (status: string) => ['draft', 'cancelled'].includes(status)

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Draft</span>
          </div>
          <p className="text-xl font-light text-white tabular-nums">{stats.draft}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Pending</span>
          </div>
          <p className="text-xl font-light text-white tabular-nums">{stats.pending + stats.ordered}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 text-purple-500 mb-1">
            <Truck className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Receiving</span>
          </div>
          <p className="text-xl font-light text-white tabular-nums">{stats.receiving}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Received</span>
          </div>
          <p className="text-xl font-light text-white tabular-nums">{stats.received}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <Package className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Total Value</span>
          </div>
          <p className="text-xl font-light text-white tabular-nums">{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Search PO #, supplier, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
          />
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => {
            setSupplierFilter(e.target.value)
            setPage(0)
          }}
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-zinc-600 text-sm"
        >
          <option value="all">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.external_name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter)
            setPage(0)
          }}
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-zinc-600 text-sm"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="ordered">Ordered</option>
          <option value="receiving">Receiving</option>
          <option value="partially_received">Partially Received</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          onClick={exportPOs}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export
        </button>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white text-black hover:bg-zinc-200 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New PO
        </button>
      </div>

      {/* Table */}
      <div className="bg-zinc-950 border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">PO #</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Expected</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500 text-sm">
                    Loading...
                  </td>
                </tr>
              ) : paginatedPOs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500 text-sm">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false} mode="popLayout">
                  {paginatedPOs.map((po) => (
                    <motion.tr
                      key={po.id}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                          type: 'spring',
                          stiffness: 500,
                          damping: 35,
                          mass: 0.8,
                        },
                      }}
                      exit={{
                        opacity: 0,
                        x: -100,
                        scale: 0.95,
                        transition: { duration: 0.2 },
                      }}
                      layout
                      onClick={() => setSelectedPOId(po.id)}
                      className="hover:bg-zinc-900/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 text-sm text-white font-mono">
                        {po.po_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {po.supplier_name || <span className="text-zinc-600">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {po.location_name || <span className="text-zinc-600">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${getStatusBadge(po.status)}`}>
                          {getStatusLabel(po.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 tabular-nums">
                        {po.received_items_count || 0}/{po.items_count || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-white tabular-nums">
                        {formatCurrency(po.total_amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500 hidden lg:table-cell whitespace-nowrap">
                        {po.expected_delivery_date
                          ? format(new Date(po.expected_delivery_date), 'MMM d, yyyy')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500 hidden lg:table-cell whitespace-nowrap">
                        {po.created_at ? format(new Date(po.created_at), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPOId(po.id)
                            }}
                            className="p-1.5 text-zinc-600 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="View/Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {canDelete(po.status) && (
                            <button
                              onClick={(e) => handleDelete(e, po.id, po.po_number)}
                              disabled={deletingId === po.id}
                              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredPOs.length)} of {filteredPOs.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 border border-zinc-800 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
              <span className="text-xs text-zinc-500 px-2 tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="p-1.5 border border-zinc-800 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PODetailModal
        poId={selectedPOId}
        isOpen={!!selectedPOId}
        onClose={() => setSelectedPOId(null)}
      />

      <CreatePOModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handlePOCreated}
      />
    </>
  )
}
