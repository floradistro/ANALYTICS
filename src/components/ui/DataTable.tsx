'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  pageSize?: number
  emptyMessage?: string
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  pageSize = 10,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(data.length / pageSize)
  const startIndex = page * pageSize
  const paginatedData = data.slice(startIndex, startIndex + pageSize)

  const getValue = (item: T, key: string) => {
    const keys = key.split('.')
    let value: unknown = item
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k]
    }
    return value
  }

  if (data.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 p-8 text-center">
        <p className="text-zinc-500 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-zinc-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider ${
                    column.className || ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {paginatedData.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-900/50 transition-colors">
                {columns.map((column) => (
                  <td
                    key={`${item.id}-${String(column.key)}`}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-zinc-300 ${
                      column.className || ''
                    }`}
                  >
                    {column.render
                      ? column.render(item)
                      : String(getValue(item, String(column.key)) ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-zinc-900 flex items-center justify-between">
          <p className="text-sm text-zinc-500 font-light">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, data.length)} of {data.length} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-2 border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-400" />
            </button>
            <span className="text-sm text-zinc-500 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="p-2 border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
