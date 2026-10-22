import React, { useState, useMemo } from 'react';
import { Invoice, CompanyProfile, Customer } from '../types';
import { formatCurrency, formatDateIndo, exportToExcel, exportToCSV } from '../utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  FileSpreadsheet,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  Users,
} from 'lucide-react';

interface ReportsViewProps {
  invoices: Invoice[];
  companies: CompanyProfile[];
  customers: Customer[];
}

type ReportType =
  | 'monthly'
  | 'customer'
  | 'company'
  | 'status'
  | 'overdue'
  | 'products'
  | 'payments_aging';

export const ReportsView: React.FC<ReportsViewProps> = ({
  invoices,
  companies,
  customers,
}) => {
  // Report Selection & Filters
  const [activeReport, setActiveReport] = useState<ReportType>('monthly');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filtered dataset for reports
  const filteredData = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.isArchived) return false;
      if (startDate && inv.invoiceDate < startDate) return false;
      if (endDate && inv.invoiceDate > endDate) return false;
      if (selectedCompany !== 'all' && inv.companyId !== selectedCompany) return false;
      if (selectedCustomer !== 'all' && inv.customerId !== selectedCustomer) return false;
      if (selectedStatus !== 'all' && inv.paymentStatus !== selectedStatus) return false;
      return true;
    });
  }, [invoices, startDate, endDate, selectedCompany, selectedCustomer, selectedStatus]);

  // Overall Aggregations
  const summary = useMemo(() => {
    const totalCount = filteredData.length;
    const totalValue = filteredData.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
    const totalPaid = filteredData.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
    const totalBalance = filteredData.reduce((acc, i) => acc + (i.balanceDue || 0), 0);
    const totalDiscount = filteredData.reduce((acc, i) => acc + (i.discountTotal || 0), 0);
    const totalTax = filteredData.reduce((acc, i) => acc + (i.taxTotal || 0), 0);
    const totalShipping = filteredData.reduce((acc, i) => acc + (i.shippingFee || 0) + (i.otherFee || 0), 0);

    const overdueList = filteredData.filter((i) => i.paymentStatus === 'overdue');
    const overdueTotal = overdueList.reduce((acc, i) => acc + (i.balanceDue || 0), 0);

    return {
      totalCount,
      totalValue,
      totalPaid,
      totalBalance,
      totalDiscount,
      totalTax,
      totalShipping,
      overdueCount: overdueList.length,
      overdueTotal,
    };
  }, [filteredData]);

  // 1. Monthly Aggregation
  const monthlyReport = useMemo(() => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const data = months.map((m, idx) => ({
      monthName: m,
      monthIndex: idx,
      count: 0,
      total: 0,
      paid: 0,
      balance: 0,
      tax: 0,
    }));

    filteredData.forEach((inv) => {
      const d = new Date(inv.invoiceDate);
      const m = d.getMonth();
      if (m >= 0 && m < 12) {
        data[m].count++;
        data[m].total += inv.grandTotal || 0;
        data[m].paid += inv.paidAmount || 0;
        data[m].balance += inv.balanceDue || 0;
        data[m].tax += inv.taxTotal || 0;
      }
    });

    return data.filter((d) => d.count > 0 || d.monthIndex <= new Date().getMonth());
  }, [filteredData]);

  // 2. Customer Aggregation
  const customerReport = useMemo(() => {
    const map = new Map<string, { customer: string; count: number; total: number; paid: number; balance: number }>();

    filteredData.forEach((inv) => {
      const custName = inv.customerSnapshot?.name || 'Pelanggan Lainnya';
      const existing = map.get(custName) || { customer: custName, count: 0, total: 0, paid: 0, balance: 0 };
      existing.count++;
      existing.total += inv.grandTotal || 0;
      existing.paid += inv.paidAmount || 0;
      existing.balance += inv.balanceDue || 0;
      map.set(custName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // 3. Top Products Aggregation
  const productReport = useMemo(() => {
    const map = new Map<string, { name: string; code: string; unit: string; qty: number; revenue: number }>();

    filteredData.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const key = item.name || 'Barang/Jasa';
        const existing = map.get(key) || {
          name: key,
          code: item.code || '-',
          unit: item.unit || 'Unit',
          qty: 0,
          revenue: 0,
        };
        existing.qty += item.qty || 0;
        existing.revenue += item.amount || 0;
        map.set(key, existing);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  // Export to Excel handler
  const handleExportExcel = () => {
    let exportRows: any[] = [];
    let sheetTitle = 'Laporan';

    if (activeReport === 'monthly') {
      sheetTitle = 'Rekap Bulanan';
      exportRows = monthlyReport.map((m) => ({
        Bulan: m.monthName,
        'Jumlah Invoice': m.count,
        'Nilai Total (Rp)': m.total,
        'Sudah Dibayar (Rp)': m.paid,
        'Sisa Piutang (Rp)': m.balance,
        'PPN (Rp)': m.tax,
      }));
    } else if (activeReport === 'customer') {
      sheetTitle = 'Rekap Pelanggan';
      exportRows = customerReport.map((c) => ({
        'Nama Pelanggan': c.customer,
        'Jumlah Transaksi': c.count,
        'Total Omset (Rp)': c.total,
        'Total Terbayar (Rp)': c.paid,
        'Sisa Piutang (Rp)': c.balance,
      }));
    } else if (activeReport === 'products') {
      sheetTitle = 'Rekap Produk Jasa';
      exportRows = productReport.map((p) => ({
        'Kode Produk': p.code,
        'Nama Produk / Jasa': p.name,
        'Total Qty': p.qty,
        Satuan: p.unit,
        'Total Pendapatan (Rp)': p.revenue,
      }));
    } else {
      sheetTitle = 'Semua Transaksi';
      exportRows = filteredData.map((inv) => ({
        'No. Invoice': inv.invoiceNumber,
        Pelanggan: inv.customerSnapshot?.name || '',
        Tanggal: formatDateIndo(inv.invoiceDate, 'short'),
        'Jatuh Tempo': formatDateIndo(inv.dueDate, 'short'),
        Status: inv.paymentStatus,
        'Total (Rp)': inv.grandTotal,
        'Terbayar (Rp)': inv.paidAmount,
        'Sisa (Rp)': inv.balanceDue,
      }));
    }

    exportToExcel(`Laporan_IMS_${activeReport}_${new Date().toISOString().split('T')[0]}`, exportRows, sheetTitle);
  };

  const handleExportCSV = () => {
    const rows = filteredData.map((inv) => ({
      'No. Invoice': inv.invoiceNumber,
      Pelanggan: inv.customerSnapshot?.name || '',
      Tanggal: formatDateIndo(inv.invoiceDate, 'short'),
      'Jatuh Tempo': formatDateIndo(inv.dueDate, 'short'),
      Status: inv.paymentStatus,
      'Total (Rp)': inv.grandTotal,
      'Terbayar (Rp)': inv.paidAmount,
      'Sisa (Rp)': inv.balanceDue,
    }));
    exportToCSV(`Laporan_IMS_${new Date().toISOString().split('T')[0]}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Rekapitulasi & Laporan Finansial</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis menyeluruh omset penagihan, performa pelanggan, dan rekap pembayaran ekspor Excel/CSV.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter size={14} className="text-sky-700" />
          <span>Filter Periode & Parameter Laporan</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Perusahaan
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="all">Semua Perusahaan</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Pelanggan
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="all">Semua Pelanggan</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Status Bayar
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="all">Semua Status</option>
              <option value="paid">Lunas</option>
              <option value="partial">Sebagian (DP)</option>
              <option value="unpaid">Belum Lunas</option>
              <option value="overdue">Jatuh Tempo</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Financial Breakdown Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Jumlah Invoice</span>
          <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
            {summary.totalCount}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Nilai Total Tagihan</span>
          <span className="font-mono text-sm font-bold text-slate-900 tabular-nums truncate block">
            {formatCurrency(summary.totalValue, 'IDR')}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Sudah Dibayar</span>
          <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums truncate block">
            {formatCurrency(summary.totalPaid, 'IDR')}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Sisa Piutang</span>
          <span className="font-mono text-sm font-bold text-amber-700 tabular-nums truncate block">
            {formatCurrency(summary.totalBalance, 'IDR')}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Jatuh Tempo ({summary.overdueCount})</span>
          <span className="font-mono text-sm font-bold text-rose-700 tabular-nums truncate block">
            {formatCurrency(summary.overdueTotal, 'IDR')}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Total PPN Pajak</span>
          <span className="font-mono text-sm font-bold text-slate-700 tabular-nums truncate block">
            {formatCurrency(summary.totalTax, 'IDR')}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Total Diskon</span>
          <span className="font-mono text-sm font-bold text-emerald-800 tabular-nums truncate block">
            {formatCurrency(summary.totalDiscount, 'IDR')}
          </span>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pb-px text-xs">
        <button
          onClick={() => setActiveReport('monthly')}
          className={`py-2 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeReport === 'monthly'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Rekap Bulanan
        </button>
        <button
          onClick={() => setActiveReport('customer')}
          className={`py-2 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeReport === 'customer'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Rekap per Pelanggan
        </button>
        <button
          onClick={() => setActiveReport('products')}
          className={`py-2 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeReport === 'products'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Produk & Jasa Terpopuler
        </button>
      </div>

      {/* Report Data Render */}
      {activeReport === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly Bar Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Grafik Nilai Tagihan Bulanan (Rp)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReport}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(0)}Jt` : v)}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val), 'IDR'), '']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="total" fill="#0284c7" name="Total Tagihan" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" fill="#10b981" name="Sudah Dibayar" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Bulan</th>
                  <th className="py-2.5 px-4 text-center">Jumlah Invoice</th>
                  <th className="py-2.5 px-4 text-right">Nilai Total</th>
                  <th className="py-2.5 px-4 text-right">Sudah Dibayar</th>
                  <th className="py-2.5 px-4 text-right">Sisa Piutang</th>
                  <th className="py-2.5 px-4 text-right">PPN Pajak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyReport.map((m) => (
                  <tr key={m.monthName} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{m.monthName}</td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums">{m.count}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900 tabular-nums">
                      {formatCurrency(m.total, 'IDR')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-700 tabular-nums">
                      {formatCurrency(m.paid, 'IDR')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-700 tabular-nums">
                      {formatCurrency(m.balance, 'IDR')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                      {formatCurrency(m.tax, 'IDR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReport === 'customer' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Nama Pelanggan</th>
                <th className="py-2.5 px-4 text-center">Jumlah Transaksi</th>
                <th className="py-2.5 px-4 text-right">Total Nilai Tagihan</th>
                <th className="py-2.5 px-4 text-right">Sudah Dibayar</th>
                <th className="py-2.5 px-4 text-right">Sisa Piutang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerReport.map((c) => (
                <tr key={c.customer} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{c.customer}</td>
                  <td className="py-2.5 px-4 text-center font-mono tabular-nums">{c.count}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {formatCurrency(c.total, 'IDR')}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-700 tabular-nums">
                    {formatCurrency(c.paid, 'IDR')}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-700 tabular-nums">
                    {formatCurrency(c.balance, 'IDR')}
                  </td>
                </tr>
              ))}
              {customerReport.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    Belum ada data pelanggan untuk filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeReport === 'products' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Kode</th>
                <th className="py-2.5 px-4">Nama Produk / Jasa</th>
                <th className="py-2.5 px-4 text-right">Total Kuantitas</th>
                <th className="py-2.5 px-4">Satuan</th>
                <th className="py-2.5 px-4 text-right">Total Pendapatan (Omset)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productReport.map((p) => (
                <tr key={p.name} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-mono text-slate-500">{p.code}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{p.name}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium">{p.qty}</td>
                  <td className="py-2.5 px-4 text-slate-600">{p.unit}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-sky-800 tabular-nums">
                    {formatCurrency(p.revenue, 'IDR')}
                  </td>
                </tr>
              ))}
              {productReport.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    Belum ada data produk untuk periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
