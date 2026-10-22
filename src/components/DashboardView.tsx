import React, { useState, useMemo } from 'react';
import { Invoice, CompanyProfile, ActivityLog } from '../types';
import { formatCurrency, formatDateIndo } from '../utils/formatters';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { printInvoice } from '../utils/printUtility';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Filter,
  Eye,
  CreditCard,
  Plus,
  Download,
  Printer,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardViewProps {
  invoices: Invoice[];
  companies: CompanyProfile[];
  activityLogs: ActivityLog[];
  onCreateInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices,
  companies,
  activityLogs,
  onCreateInvoice,
  onViewInvoice,
  onRecordPayment,
}) => {
  // Filter States
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.isArchived) return false;
      if (selectedCompanyId !== 'all' && inv.companyId !== selectedCompanyId) return false;
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'paid' && inv.paymentStatus !== 'paid') return false;
        if (selectedStatus === 'unpaid' && inv.paymentStatus !== 'unpaid') return false;
        if (selectedStatus === 'partial' && inv.paymentStatus !== 'partial') return false;
        if (selectedStatus === 'overdue' && inv.paymentStatus !== 'overdue') return false;
      }
      if (selectedYear !== 'all') {
        const invYear = new Date(inv.invoiceDate).getFullYear().toString();
        if (invYear !== selectedYear) return false;
      }
      return true;
    });
  }, [invoices, selectedCompanyId, selectedStatus, selectedYear]);

  // Dynamic KPI Math
  const totalInvoices = filteredInvoices.length;
  const totalValue = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [filteredInvoices]);

  const totalPaid = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  }, [filteredInvoices]);

  const totalUnpaid = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
  }, [filteredInvoices]);

  const overdueInvoices = useMemo(() => {
    return filteredInvoices.filter((inv) => inv.paymentStatus === 'overdue');
  }, [filteredInvoices]);

  const totalOverdueValue = useMemo(() => {
    return overdueInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
  }, [overdueInvoices]);

  // Current Month Value
  const currentMonthValue = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return filteredInvoices
      .filter((inv) => {
        const d = new Date(inv.invoiceDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [filteredInvoices]);

  // Monthly Revenue Chart Data
  const monthlyChartData = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    const data = months.map((m, i) => ({
      name: m,
      monthIndex: i,
      total: 0,
      paid: 0,
    }));

    filteredInvoices.forEach((inv) => {
      const d = new Date(inv.invoiceDate);
      const mIdx = d.getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        data[mIdx].total += inv.grandTotal || 0;
        data[mIdx].paid += inv.paidAmount || 0;
      }
    });

    return data;
  }, [filteredInvoices]);

  // Payment Status Distribution Pie Data
  const statusPieData = useMemo(() => {
    const counts = { paid: 0, partial: 0, unpaid: 0, overdue: 0 };
    filteredInvoices.forEach((inv) => {
      if (inv.paymentStatus === 'paid') counts.paid++;
      else if (inv.paymentStatus === 'partial') counts.partial++;
      else if (inv.paymentStatus === 'overdue') counts.overdue++;
      else counts.unpaid++;
    });

    return [
      { name: 'Lunas', value: counts.paid, color: '#16a34a' },
      { name: 'Sebagian', value: counts.partial, color: '#f59e0b' },
      { name: 'Belum Bayar', value: counts.unpaid, color: '#64748b' },
      { name: 'Jatuh Tempo', value: counts.overdue, color: '#dc2626' },
    ].filter((item) => item.value > 0);
  }, [filteredInvoices]);

  // Recent Invoices (limit 5)
  const recentInvoices = useMemo(() => {
    return [...filteredInvoices]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [filteredInvoices]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Create */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard Keuangan & Rekap</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ikhtisar operasional invoice, status pelunasan piutang, dan tren pendapatan transaksi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCreateInvoice}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Buat Invoice Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-semibold">
          <Filter size={14} className="text-sky-700" />
          <span>Filter Data:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Company Filter */}
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">Semua Perusahaan</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">Semua Status Bayar</option>
            <option value="paid">Lunas</option>
            <option value="partial">Sebagian (DP)</option>
            <option value="unpaid">Belum Lunas</option>
            <option value="overdue">Jatuh Tempo / Overdue</option>
          </select>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:ring-1 focus:ring-sky-500 font-mono"
          >
            <option value="all">Semua Tahun</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          {(selectedCompanyId !== 'all' || selectedStatus !== 'all' || selectedYear !== '2026') && (
            <button
              onClick={() => {
                setSelectedCompanyId('all');
                setSelectedStatus('all');
                setSelectedYear('2026');
              }}
              className="text-xs text-sky-600 hover:text-sky-800 font-medium px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI Statistic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Invoice & Omset */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Nilai Tagihan</span>
            <div className="p-1.5 bg-sky-50 text-sky-700 rounded-md">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(totalValue, 'IDR')}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <FileText size={13} />
            <span>{totalInvoices} Dokumen Invoice</span>
          </div>
        </div>

        {/* Card 2: Sudah Dibayar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Sudah Diterima (Lunas)</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
            {formatCurrency(totalPaid, 'IDR')}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {totalValue > 0
              ? `${((totalPaid / totalValue) * 100).toFixed(1)}% tertagih`
              : '0% tertagih'}
          </div>
        </div>

        {/* Card 3: Belum Dibayar / Sisa Piutang */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Sisa Piutang Berjalan</span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-md">
              <Clock size={16} />
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-amber-700 tabular-nums">
            {formatCurrency(totalUnpaid, 'IDR')}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Termin & invoice belum lunas
          </div>
        </div>

        {/* Card 4: Overdue & Bulan Ini */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tagihan Jatuh Tempo</span>
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-md">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-rose-700 tabular-nums">
            {formatCurrency(totalOverdueValue, 'IDR')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{overdueInvoices.length} invoice lewat tempo</span>
            <span className="font-mono text-slate-700 font-medium">Bulan Ini: {formatCurrency(currentMonthValue, 'IDR')}</span>
          </div>
        </div>
      </div>

      {/* Charts Section: Monthly Revenue & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Revenue Trend (Col 8) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tren Nilai Tagihan Bulanan</h2>
              <p className="text-xs text-slate-500">
                Perbandingan nilai tagihan diterbitkan vs pembayaran diterima.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                <span className="text-slate-600">Total Invoice</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600">Terbayar</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(0)}Jt` : val)}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val), 'IDR'), '']}
                  labelFormatter={(label) => `Bulan ${label}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  name="Nilai Invoice"
                />
                <Area
                  type="monotone"
                  dataKey="paid"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPaid)"
                  name="Sudah Dibayar"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution (Col 4) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Distribusi Status Bayar</h2>
            <p className="text-xs text-slate-500 mb-3">
              Rasio invoice lunas, sebagian, dan tertunda.
            </p>

            <div className="h-44 w-full flex items-center justify-center">
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} invoice`, name]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-400 italic">Belum ada data invoice</div>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {item.value} ({totalInvoices > 0 ? `${((item.value / totalInvoices) * 100).toFixed(0)}%` : '0%'})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Bottom Grid: Recent Invoices & Recent Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Invoices Table (Col 8) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Invoice Terbaru</h2>
              <p className="text-xs text-slate-500">5 transaksi dokumen terakhir.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">No. Invoice</th>
                  <th className="py-2.5 px-3 font-semibold">Pelanggan</th>
                  <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {inv.customerSnapshot?.name || 'Pelanggan'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                      {formatDateIndo(inv.invoiceDate, 'short')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(inv.grandTotal, inv.currency)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
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
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="p-1 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded cursor-pointer"
                          title="Lihat Invoice"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => {
                            const safeFilename = `${inv.invoiceNumber.replace(/[\/\\]/g, '_')}_${inv.customerSnapshot?.name || 'Invoice'}.pdf`;
                            downloadInvoicePDF(inv, safeFilename);
                          }}
                          className="p-1 text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded cursor-pointer"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => printInvoice(inv)}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                          title="Cetak Invoice"
                        >
                          <Printer size={14} />
                        </button>
                        {inv.paymentStatus !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => onRecordPayment(inv)}
                            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded cursor-pointer"
                            title="Catat Pembayaran"
                          >
                            <CreditCard size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                      Tidak ada invoice sesuai filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Logs (Col 4) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-900">Aktivitas Terkini</h2>
            <p className="text-xs text-slate-500">Riwayat audit trail sistem.</p>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {activityLogs.slice(0, 7).map((log) => (
              <div key={log.id} className="text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
                  <span className="font-medium text-slate-600">{log.performedBy}</span>
                  <span className="tabular-nums">{formatDateIndo(log.timestamp, 'short')}</span>
                </div>
                <p className="text-slate-700 leading-snug">{log.description}</p>
              </div>
            ))}
            {activityLogs.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-4">Belum ada catatan aktivitas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
