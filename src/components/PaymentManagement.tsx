import React, { useState, useMemo } from 'react';
import { Invoice, PaymentRecord } from '../types';
import { dataService } from '../services/dataService';
import { formatCurrency, formatDateIndo, exportToExcel } from '../utils/formatters';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Ban,
  Eye,
  CheckCircle2,
  DollarSign,
  Building,
} from 'lucide-react';

interface PaymentManagementProps {
  invoices: Invoice[];
  onPaymentUpdated: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onRecordNewPaymentClick: () => void;
}

export const PaymentManagement: React.FC<PaymentManagementProps> = ({
  invoices,
  onPaymentUpdated,
  onViewInvoice,
  onRecordNewPaymentClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');

  // Flatten all payments across invoices
  const allPayments = useMemo(() => {
    const list: (PaymentRecord & { invoice: Invoice })[] = [];
    invoices.forEach((inv) => {
      (inv.payments || []).forEach((p) => {
        list.push({ ...p, invoice: inv });
      });
    });
    return list.sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  }, [invoices]);

  const filteredPayments = useMemo(() => {
    return allPayments.filter((p) => {
      if (selectedMethod !== 'all' && p.paymentMethod !== selectedMethod) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.invoiceNumber.toLowerCase().includes(term) ||
        p.referenceNumber?.toLowerCase().includes(term) ||
        p.destinationBank?.toLowerCase().includes(term) ||
        p.invoice.customerSnapshot?.name.toLowerCase().includes(term) ||
        p.notes?.toLowerCase().includes(term)
      );
    });
  }, [allPayments, selectedMethod, searchTerm]);

  // Statistics
  const totalPaidRevenue = useMemo(() => {
    return allPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [allPayments]);

  const handleCancelPayment = (p: PaymentRecord) => {
    const reason = prompt(
      `Masukkan alasan pembatalan pembayaran ${p.referenceNumber} sebesar ${formatCurrency(p.amount, 'IDR')}:`
    );
    if (reason && reason.trim()) {
      dataService.cancelPayment(p.id, reason.trim());
      onPaymentUpdated();
    }
  };

  const handleExportExcel = () => {
    const rows = filteredPayments.map((p) => ({
      'No. Invoice': p.invoiceNumber,
      Pelanggan: p.invoice.customerSnapshot?.name || '',
      'Tanggal Bayar': formatDateIndo(p.paymentDate, 'short'),
      'Nominal (Rp)': p.amount,
      'Metode Bayar': p.paymentMethod,
      'Bank / Rekening Tujuan': p.destinationBank,
      'No. Referensi': p.referenceNumber,
      'Dicatat Oleh': p.recordedBy,
      Catatan: p.notes || '',
    }));
    exportToExcel(`Riwayat_Pembayaran_${new Date().toISOString().split('T')[0]}`, rows, 'Pembayaran');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Buku Pembayaran & Kas Masuk</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log seluruh transaksi pembayaran masuk, pelunasan sebagian (DP), dan rekonsiliasi mutasi bank.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={onRecordNewPaymentClick}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Catat Pembayaran</span>
          </button>
        </div>
      </div>

      {/* Summary Mini Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">Total Penerimaan Pembayaran</span>
            <span className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
              {formatCurrency(totalPaidRevenue, 'IDR')}
            </span>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">Total Transaksi Masuk</span>
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {allPayments.length} Transaksi
            </span>
          </div>
          <div className="p-2 bg-sky-50 text-sky-700 rounded-lg">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">Metode Pembayaran Utama</span>
            <span className="text-sm font-bold text-slate-800">
              Transfer Bank BCA & Mandiri
            </span>
          </div>
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <Building size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor invoice, referensi TRX, bank, atau nama pelanggan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Metode:</span>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
          >
            <option value="all">Semua Metode</option>
            <option value="bank_transfer">Transfer Bank</option>
            <option value="cash">Tunai / Cash</option>
            <option value="qris">QRIS</option>
            <option value="credit_card">Kartu Kredit / Debit</option>
            <option value="cheque">Giro / Cek</option>
          </select>
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-3.5">No. Referensi & Tanggal</th>
                <th className="py-3 px-3">No. Invoice & Pelanggan</th>
                <th className="py-3 px-3">Metode & Rekening Tujuan</th>
                <th className="py-3 px-3.5 text-right">Nominal Masuk</th>
                <th className="py-3 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3.5">
                    <div className="font-mono font-bold text-slate-900">{p.referenceNumber}</div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      {formatDateIndo(p.paymentDate, 'long')}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-sky-800">{p.invoiceNumber}</div>
                    <div className="text-[11px] text-slate-600 font-medium">
                      {p.invoice.customerSnapshot?.name}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-slate-600">
                    <div className="font-medium text-slate-800 capitalize">
                      {p.paymentMethod.replace('_', ' ')}
                    </div>
                    <div className="text-[11px] text-slate-500">{p.destinationBank}</div>
                  </td>

                  <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 text-sm tabular-nums">
                    {formatCurrency(p.amount, 'IDR')}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onViewInvoice(p.invoice)}
                        className="p-1 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded"
                        title="Lihat Invoice Terkait"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleCancelPayment(p)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Batalkan Transaksi Pembayaran Ini"
                      >
                        <Ban size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                    Belum ada riwayat pembayaran sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
