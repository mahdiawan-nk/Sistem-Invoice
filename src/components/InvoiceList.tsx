import React, { useState, useMemo } from 'react';
import { Invoice, CompanyProfile, Customer } from '../types';
import { formatCurrency, formatDateIndo, exportToExcel, exportToCSV } from '../utils/formatters';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { printInvoice } from '../utils/printUtility';
import {
  Search,
  Filter,
  Eye,
  Edit3,
  Copy,
  Printer,
  Download,
  CreditCard,
  Ban,
  Archive,
  Trash2,
  Send,
  Plus,
  FileSpreadsheet,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

interface InvoiceListProps {
  invoices: Invoice[];
  companies: CompanyProfile[];
  customers: Customer[];
  onCreateInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditDraft: (invoice: Invoice) => void;
  onDuplicateInvoice: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onCancelInvoice: (invoiceId: string) => void;
  onArchiveInvoice: (invoiceId: string, archive: boolean) => void;
  onDeleteDraft: (invoiceId: string) => void;
  onMarkSent: (invoice: Invoice) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  companies,
  customers,
  onCreateInvoice,
  onViewInvoice,
  onEditDraft,
  onDuplicateInvoice,
  onRecordPayment,
  onCancelInvoice,
  onArchiveInvoice,
  onDeleteDraft,
  onMarkSent,
}) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'>('date_desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Multi-select for bulk export
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtered & Sorted Invoices
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // Archive filter
        if (showArchived ? !inv.isArchived : inv.isArchived) return false;

        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchNumber = inv.invoiceNumber.toLowerCase().includes(term);
          const matchCustomer = inv.customerSnapshot?.name?.toLowerCase().includes(term);
          const matchCompany = inv.companySnapshot?.name?.toLowerCase().includes(term);
          const matchPO = inv.poNumber?.toLowerCase().includes(term);
          if (!matchNumber && !matchCustomer && !matchCompany && !matchPO) return false;
        }

        // Status Filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'draft' && inv.status !== 'draft') return false;
          if (statusFilter === 'paid' && inv.paymentStatus !== 'paid') return false;
          if (statusFilter === 'unpaid' && inv.paymentStatus !== 'unpaid') return false;
          if (statusFilter === 'partial' && inv.paymentStatus !== 'partial') return false;
          if (statusFilter === 'overdue' && inv.paymentStatus !== 'overdue') return false;
          if (statusFilter === 'cancelled' && inv.status !== 'cancelled') return false;
        }

        // Company Filter
        if (companyFilter !== 'all' && inv.companyId !== companyFilter) return false;

        // Customer Filter
        if (customerFilter !== 'all' && inv.customerId !== customerFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
        }
        if (sortBy === 'total_desc') {
          return (b.grandTotal || 0) - (a.grandTotal || 0);
        }
        if (sortBy === 'total_asc') {
          return (a.grandTotal || 0) - (b.grandTotal || 0);
        }
        return 0;
      });
  }, [
    invoices,
    showArchived,
    searchTerm,
    statusFilter,
    companyFilter,
    customerFilter,
    sortBy,
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredInvoices.slice(start, start + rowsPerPage);
  }, [filteredInvoices, currentPage, rowsPerPage]);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedInvoices.map((i) => i.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Export Handler
  const handleExportExcel = () => {
    const target = selectedIds.length > 0
      ? filteredInvoices.filter((i) => selectedIds.includes(i.id))
      : filteredInvoices;

    const rows = target.map((inv) => ({
      'No. Invoice': inv.invoiceNumber,
      'Perusahaan Penerbit': inv.companySnapshot?.name || '',
      'Pelanggan': inv.customerSnapshot?.name || '',
      'Tanggal Invoice': formatDateIndo(inv.invoiceDate, 'short'),
      'Jatuh Tempo': formatDateIndo(inv.dueDate, 'short'),
      'Status Dokumen': inv.status,
      'Status Pembayaran': inv.paymentStatus,
      'Subtotal (Rp)': inv.subtotal,
      'Diskon (Rp)': inv.discountTotal,
      'PPN (Rp)': inv.taxTotal,
      'Total Tagihan (Rp)': inv.grandTotal,
      'Sudah Dibayar (Rp)': inv.paidAmount,
      'Sisa Piutang (Rp)': inv.balanceDue,
    }));

    exportToExcel(`Daftar_Invoice_${new Date().toISOString().split('T')[0]}`, rows, 'Daftar Invoice');
  };

  const handleExportCSV = () => {
    const target = selectedIds.length > 0
      ? filteredInvoices.filter((i) => selectedIds.includes(i.id))
      : filteredInvoices;

    const rows = target.map((inv) => ({
      'No. Invoice': inv.invoiceNumber,
      'Perusahaan': inv.companySnapshot?.name || '',
      'Pelanggan': inv.customerSnapshot?.name || '',
      'Tanggal': formatDateIndo(inv.invoiceDate, 'short'),
      'Jatuh Tempo': formatDateIndo(inv.dueDate, 'short'),
      'Status Dokumen': inv.status,
      'Status Bayar': inv.paymentStatus,
      'Total': inv.grandTotal,
      'Terbayar': inv.paidAmount,
      'Sisa': inv.balanceDue,
    }));

    exportToCSV(`Daftar_Invoice_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {showArchived ? 'Arsip Invoice' : 'Semua Invoice & Tagihan'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap riwayat dokumen penagihan, status pembayaran piutang, dan unduh berkas resmi.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              showArchived
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Archive size={14} />
            <span>{showArchived ? 'Kembali ke Invoice Aktif' : 'Lihat Arsip'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
            title="Ekspor ke Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={onCreateInvoice}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Buat Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor invoice, nama pelanggan, atau nomor PO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Quick Filter Selects */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="all">Semua Status</option>
              <option value="unpaid">Belum Lunas</option>
              <option value="partial">Sebagian (DP)</option>
              <option value="paid">Lunas</option>
              <option value="overdue">Jatuh Tempo</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Dibatalkan</option>
            </select>

            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="all">Semua Perusahaan</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="date_desc">Tanggal: Terbaru</option>
              <option value="date_asc">Tanggal: Terlama</option>
              <option value="total_desc">Nilai: Tertinggi</option>
              <option value="total_asc">Nilai: Terendah</option>
            </select>
          </div>
        </div>

        {/* Selected count info & bulk action */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-sky-50 border border-sky-100 rounded-md text-xs text-sky-950">
            <span>
              <span className="font-bold">{selectedIds.length}</span> invoice terpilih
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-2.5 py-1 bg-white border border-sky-200 text-sky-800 rounded font-semibold hover:bg-sky-50 text-[11px]"
              >
                Ekspor Terpilih ke Excel
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-slate-500 hover:text-slate-800 text-[11px]"
              >
                Batalkan Pilihan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-8 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-700">
                    {selectedIds.length > 0 && selectedIds.length === paginatedInvoices.length ? (
                      <CheckSquare size={15} className="text-sky-600" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">No. Invoice</th>
                <th className="py-3 px-3">Pelanggan</th>
                <th className="py-3 px-3">Tanggal / Tempo</th>
                <th className="py-3 px-3 text-right">Total Tagihan</th>
                <th className="py-3 px-3 text-right">Sudah Dibayar</th>
                <th className="py-3 px-3 text-right">Sisa Piutang</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedInvoices.map((inv) => {
                const isSelected = selectedIds.includes(inv.id);
                return (
                  <tr
                    key={inv.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-sky-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggleSelect(inv.id)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        {isSelected ? (
                          <CheckSquare size={15} className="text-sky-600" />
                        ) : (
                          <Square size={15} />
                        )}
                      </button>
                    </td>

                    {/* Invoice Number */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {inv.companySnapshot?.name}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">
                        {inv.customerSnapshot?.name || 'Pelanggan'}
                      </div>
                      {inv.customerSnapshot?.contactPerson && (
                        <div className="text-[11px] text-slate-400">
                          {inv.customerSnapshot.contactPerson}
                        </div>
                      )}
                    </td>

                    {/* Dates */}
                    <td className="py-3 px-3 tabular-nums">
                      <div className="text-slate-700">{formatDateIndo(inv.invoiceDate, 'short')}</div>
                      <div className="text-[11px] text-slate-400">
                        Tempo: {formatDateIndo(inv.dueDate, 'short')}
                      </div>
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(inv.grandTotal, inv.currency)}
                    </td>

                    {/* Paid */}
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 tabular-nums">
                      {formatCurrency(inv.paidAmount, inv.currency)}
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-rose-600 tabular-nums">
                      {formatCurrency(inv.balanceDue, inv.currency)}
                    </td>

                    {/* Status Badges */}
                    <td className="py-3 px-3 text-center">
                      {inv.status === 'draft' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          Draft
                        </span>
                      ) : inv.status === 'cancelled' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Dibatalkan
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            inv.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.paymentStatus === 'partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : inv.paymentStatus === 'overdue'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {inv.paymentStatus === 'paid'
                            ? 'Lunas'
                            : inv.paymentStatus === 'partial'
                            ? 'Sebagian'
                            : inv.paymentStatus === 'overdue'
                            ? 'Jatuh Tempo'
                            : 'Belum Lunas'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Lihat Pratinjau Invoice"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() => {
                            const safeFilename = `${inv.invoiceNumber.replace(/[\/\\]/g, '_')}_${inv.customerSnapshot?.name || 'Invoice'}.pdf`;
                            downloadInvoicePDF(inv, safeFilename);
                          }}
                          className="p-1.5 text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                          title="Download PDF A4"
                        >
                          <Download size={14} />
                        </button>

                        <button
                          onClick={() => printInvoice(inv)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Cetak Dokumen Invoice"
                        >
                          <Printer size={14} />
                        </button>

                        {inv.status === 'draft' && (
                          <button
                            onClick={() => onEditDraft(inv)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded transition-colors"
                            title="Edit Draft"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}

                        {inv.paymentStatus !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => onRecordPayment(inv)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                            title="Catat Pembayaran"
                          >
                            <CreditCard size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => onDuplicateInvoice(inv)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="Duplikasi Invoice"
                        >
                          <Copy size={14} />
                        </button>

                        {inv.status !== 'cancelled' && inv.status !== 'draft' && (
                          <button
                            onClick={() => {
                              if (confirm(`Apakah Anda yakin ingin membatalkan invoice ${inv.invoiceNumber}?`)) {
                                onCancelInvoice(inv.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Batalkan Invoice"
                          >
                            <Ban size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => onArchiveInvoice(inv.id, !inv.isArchived)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title={inv.isArchived ? 'Pulihkan dari Arsip' : 'Arsipkan Invoice'}
                        >
                          <Archive size={14} />
                        </button>

                        {inv.status === 'draft' && (
                          <button
                            onClick={() => {
                              if (confirm(`Hapus draft invoice ${inv.invoiceNumber}?`)) {
                                onDeleteDraft(inv.id);
                              }
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus Draft"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                    Tidak ada invoice ditemukan sesuai kriteria pencarian dan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Row Count Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Tampilkan</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>dari {filteredInvoices.length} invoice</span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
