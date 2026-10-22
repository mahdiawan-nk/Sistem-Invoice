import React, { useState, useMemo } from 'react';
import { Customer, Invoice } from '../types';
import { dataService } from '../services/dataService';
import { formatCurrency, formatDateIndo, exportToExcel } from '../utils/formatters';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Upload,
  Eye,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface CustomerManagementProps {
  customers: Customer[];
  invoices: Invoice[];
  onCustomerUpdated: () => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  invoices,
  onCustomerUpdated,
  onViewInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  // Form State
  const [form, setForm] = useState<Partial<Customer>>({
    name: '',
    contactPerson: '',
    address: '',
    city: 'Surabaya',
    province: 'Jawa Timur',
    postalCode: '',
    phone: '',
    email: '',
    npwp: '',
    notes: '',
    isActive: true,
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        c.contactPerson?.toLowerCase().includes(term) ||
        c.city?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.email?.toLowerCase().includes(term)
      );
    });
  }, [customers, searchTerm]);

  // Calculate turnover per customer
  const customerStats = useMemo(() => {
    const stats: Record<string, { totalSpend: number; invoiceCount: number; unpaid: number }> = {};
    invoices.forEach((inv) => {
      if (inv.isArchived) return;
      const id = inv.customerId;
      if (!stats[id]) stats[id] = { totalSpend: 0, invoiceCount: 0, unpaid: 0 };
      stats[id].totalSpend += inv.grandTotal || 0;
      stats[id].unpaid += inv.balanceDue || 0;
      stats[id].invoiceCount++;
    });
    return stats;
  }, [invoices]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm({
      name: '',
      contactPerson: '',
      address: '',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '',
      phone: '',
      email: '',
      npwp: '',
      notes: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({ ...customer });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      alert('Nama perusahaan / pelanggan wajib diisi.');
      return;
    }

    const payload: Customer = {
      id: editingCustomer?.id || `cust-${Date.now()}`,
      name: form.name.trim(),
      contactPerson: form.contactPerson?.trim() || form.name.trim(),
      address: form.address || '',
      city: form.city || 'Surabaya',
      province: form.province || 'Jawa Timur',
      postalCode: form.postalCode || '',
      phone: form.phone || '',
      email: form.email || '',
      npwp: form.npwp || '',
      notes: form.notes || '',
      isActive: form.isActive ?? true,
      createdAt: editingCustomer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataService.saveCustomer(payload);
    onCustomerUpdated();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Hapus pelanggan "${name}"?`)) {
      dataService.deleteCustomer(id);
      onCustomerUpdated();
      if (selectedCustomerForHistory?.id === id) {
        setSelectedCustomerForHistory(null);
      }
    }
  };

  // CSV / Excel Import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        data.forEach((row) => {
          const name = row['Nama'] || row['Nama Perusahaan'] || row['name'] || row['Customer'];
          if (name) {
            dataService.saveCustomer({
              id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: String(name),
              contactPerson: row['Kontak'] || row['contactPerson'] || String(name),
              address: row['Alamat'] || row['address'] || '',
              city: row['Kota'] || row['city'] || 'Jakarta',
              province: row['Provinsi'] || row['province'] || 'DKI Jakarta',
              postalCode: String(row['Kode Pos'] || row['postalCode'] || ''),
              phone: String(row['Telepon'] || row['phone'] || ''),
              email: String(row['Email'] || row['email'] || ''),
              npwp: String(row['NPWP'] || row['npwp'] || ''),
              notes: row['Catatan'] || '',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            importedCount++;
          }
        });

        alert(`Berhasil mengimpor ${importedCount} data pelanggan!`);
        onCustomerUpdated();
      } catch (err) {
        alert('Gagal membaca berkas. Pastikan format CSV atau Excel sesuai.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportCustomers = () => {
    const rows = customers.map((c) => ({
      'Nama Pelanggan': c.name,
      'Kontak PIC': c.contactPerson,
      Alamat: c.address,
      Kota: c.city,
      Provinsi: c.province,
      'Kode Pos': c.postalCode,
      Telepon: c.phone,
      Email: c.email,
      NPWP: c.npwp || '',
      Status: c.isActive ? 'Aktif' : 'Nonaktif',
      'Total Transaksi': customerStats[c.id]?.totalSpend || 0,
      'Sisa Piutang': customerStats[c.id]?.unpaid || 0,
    }));
    exportToExcel(`Daftar_Pelanggan_${new Date().toISOString().split('T')[0]}`, rows, 'Pelanggan');
  };

  // Invoices for currently inspected customer
  const customerInvoices = useMemo(() => {
    if (!selectedCustomerForHistory) return [];
    return invoices.filter((i) => i.customerId === selectedCustomerForHistory.id && !i.isArchived);
  }, [invoices, selectedCustomerForHistory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pengelolaan Pelanggan & Penerima</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola direktori kontak pelanggan, riwayat penagihan, dan impor data massal.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Import File Button */}
          <label className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5">
            <Upload size={14} className="text-sky-700" />
            <span>Impor CSV / Excel</span>
            <input type="file" accept=".csv, .xlsx, .xls" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={handleExportCustomers}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Ekspor</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pelanggan berdasarkan nama, PIC, kota, nomor telepon, atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          Total: <span className="font-bold text-slate-800">{filteredCustomers.length}</span> pelanggan
        </span>
      </div>

      {/* Main Content Grid: Customer Table + Customer Invoice History Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Customer Table (Col 8 or 12) */}
        <div className={`${selectedCustomerForHistory ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-3.5">Nama Pelanggan</th>
                  <th className="py-3 px-3">Kontak & Lokasi</th>
                  <th className="py-3 px-3 text-right">Total Transaksi</th>
                  <th className="py-3 px-3 text-right">Sisa Piutang</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => {
                  const stat = customerStats[c.id] || { totalSpend: 0, invoiceCount: 0, unpaid: 0 };
                  const isSelected = selectedCustomerForHistory?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-sky-50/50' : ''}`}
                    >
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        {c.contactPerson && c.contactPerson !== c.name && (
                          <div className="text-[11px] text-slate-500">PIC: {c.contactPerson}</div>
                        )}
                        {c.npwp && <div className="text-[10px] text-slate-400 font-mono">NPWP: {c.npwp}</div>}
                      </td>

                      <td className="py-3 px-3 text-slate-600 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span>{c.city}, {c.province}</span>
                        </div>
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            <span className="font-mono">{c.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(stat.totalSpend, 'IDR')}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {stat.invoiceCount} invoice
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-rose-600 tabular-nums">
                        {stat.unpaid > 0 ? formatCurrency(stat.unpaid, 'IDR') : '-'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedCustomerForHistory(isSelected ? null : c)}
                            className={`p-1.5 rounded transition-colors ${
                              isSelected ? 'bg-sky-700 text-white' : 'text-slate-500 hover:text-sky-700 hover:bg-slate-100'
                            }`}
                            title="Riwayat Transaksi"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded transition-colors"
                            title="Edit Data"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                      Tidak ada pelanggan ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer History Drawer (Col 5) */}
        {selectedCustomerForHistory && (
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Riwayat Invoice Pelanggan</h3>
                <p className="text-xs text-sky-700 font-semibold">{selectedCustomerForHistory.name}</p>
              </div>
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {customerInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 block">{inv.invoiceNumber}</span>
                    <span className="text-[11px] text-slate-500">{formatDateIndo(inv.invoiceDate, 'short')}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 tabular-nums block">
                      {formatCurrency(inv.grandTotal, inv.currency)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        inv.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.paymentStatus === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {inv.paymentStatus === 'paid' ? 'Lunas' : inv.paymentStatus === 'partial' ? 'DP Sebagian' : 'Belum Lunas'}
                    </span>
                  </div>

                  <button
                    onClick={() => onViewInvoice(inv)}
                    className="p-1 text-slate-400 hover:text-sky-700 ml-2"
                    title="Buka Invoice"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              ))}
              {customerInvoices.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  Belum ada invoice untuk pelanggan ini.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Perusahaan / Pelanggan *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: PT Cipta Media Solusindo"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Kontak PIC
                  </label>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    placeholder="Nama PIC"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NPWP Pelanggan
                  </label>
                  <input
                    type="text"
                    value={form.npwp}
                    onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                    placeholder="00.000.000.0-000.000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Lengkap *
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Jl. Kuningan Barat No. 8..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kota / Kab *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Provinsi *</label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Pos</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Telepon / WA</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Informasi rekening tujuan atau termin khusus..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
