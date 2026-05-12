/**
 * Export data to Excel format
 * Using CSV format (compatible with Excel)
 */

export function exportToExcel(filename, data, columns) {
  // Create CSV content
  const headers = columns.map(col => `"${col.header}"`).join(',')

  const rows = data.map(row =>
    columns.map(col => {
      const value = col.accessor(row)
      // Escape quotes and wrap in quotes
      const escaped = String(value || '').replace(/"/g, '""')
      return `"${escaped}"`
    }).join(',')
  )

  const csv = [headers, ...rows].join('\n')

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportPOListToExcel(pos) {
  const columns = [
    { header: 'PO Number', accessor: (po) => po.poNumber },
    { header: 'Date', accessor: (po) => new Date(po.poDate).toLocaleDateString('id-ID') },
    { header: 'Project Code', accessor: (po) => po.projectCode },
    { header: 'Supplier', accessor: (po) => po.supplierName },
    { header: 'Delivery Target', accessor: (po) => new Date(po.deliveryTime).toLocaleDateString('id-ID') },
    { header: 'PO Health', accessor: (po) => po.poHealth },
    { header: 'Status', accessor: (po) => po.status },
    { header: 'Total Amount (IDR)', accessor: (po) => parseFloat(po.totalAmount || 0) },
    { header: 'Item Count', accessor: (po) => po.items?.length || 0 },
  ]

  const timestamp = new Date().toISOString().slice(0, 10)
  exportToExcel(`PO-List-${timestamp}`, pos, columns)
}

export function exportPOItemsToExcel(items) {
  const columns = [
    { header: 'PO Number', accessor: (item) => item.poNumber },
    { header: 'Description', accessor: (item) => item.description },
    { header: 'Part Number', accessor: (item) => item.partNumber || '—' },
    { header: 'Qty', accessor: (item) => item.qty },
    { header: 'Unit', accessor: (item) => item.unit },
    { header: 'Unit Price (IDR)', accessor: (item) => parseFloat(item.unitPrice || 0) },
    { header: 'Total Price (IDR)', accessor: (item) => parseInt(item.qty) * parseFloat(item.unitPrice || 0) },
    { header: 'Project Code', accessor: (item) => item.projectCode },
    { header: 'Mat In Date', accessor: (item) => item.matIn ? new Date(item.matIn).toLocaleDateString('id-ID') : '—' },
    { header: 'PR No', accessor: (item) => item.prNo || '—' },
  ]

  const timestamp = new Date().toISOString().slice(0, 10)
  exportToExcel(`PO-Items-${timestamp}`, items, columns)
}
