import React, { useState, useMemo } from 'react';
import { ProductCatalogItem } from '../types';
import { dataService } from '../services/dataService';
import { formatCurrency, exportToExcel } from '../utils/formatters';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  FileSpreadsheet,
  X,
  Tag,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductCatalogProps {
  products: ProductCatalogItem[];
  onProductUpdated: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onProductUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductCatalogItem | null>(null);

  const [form, setForm] = useState<Partial<ProductCatalogItem>>({
    code: '',
    name: '',
    description: '',
    unit: 'Unit',
    defaultPrice: 0,
    category: 'Hardware Jaringan',
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    });
  }, [products, selectedCategory, searchTerm]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({
      code: `SKU-${Date.now().toString().slice(-4)}`,
      name: '',
      description: '',
      unit: 'Unit',
      defaultPrice: 0,
      category: 'Hardware Jaringan',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductCatalogItem) => {
    setEditingProduct(p);
    setForm({ ...p });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.code?.trim()) {
      alert('Nama dan kode produk wajib diisi.');
      return;
    }

    const payload: ProductCatalogItem = {
      id: editingProduct?.id || `prod-${Date.now()}`,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description || '',
      unit: form.unit || 'Unit',
      defaultPrice: Number(form.defaultPrice) || 0,
      category: form.category || 'Umum',
      createdAt: editingProduct?.createdAt || new Date().toISOString(),
    };

    dataService.saveProduct(payload);
    onProductUpdated();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Hapus produk "${name}" dari katalog?`)) {
      dataService.deleteProduct(id);
      onProductUpdated();
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
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let count = 0;
        data.forEach((row) => {
          const name = row['Nama'] || row['Nama Produk'] || row['name'];
          if (name) {
            dataService.saveProduct({
              id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              code: String(row['Kode'] || row['code'] || `SKU-${Date.now().toString().slice(-4)}`),
              name: String(name),
              description: String(row['Deskripsi'] || row['description'] || ''),
              unit: String(row['Satuan'] || row['unit'] || 'Unit'),
              defaultPrice: Number(row['Harga'] || row['price'] || 0),
              category: String(row['Kategori'] || row['category'] || 'Umum'),
              createdAt: new Date().toISOString(),
            });
            count++;
          }
        });

        alert(`Berhasil mengimpor ${count} item katalog!`);
        onProductUpdated();
      } catch (err) {
        alert('Gagal mengimpor file spreadsheet.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const rows = products.map((p) => ({
      'Kode SKU': p.code,
      'Nama Produk/Jasa': p.name,
      Deskripsi: p.description,
      Satuan: p.unit,
      'Harga Default (Rp)': p.defaultPrice,
      Kategori: p.category,
    }));
    exportToExcel(`Katalog_Produk_${new Date().toISOString().split('T')[0]}`, rows, 'Katalog');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Katalog Produk & Jasa</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Master daftar harga hardware, kabel, perangkat jaringan, dan jasa instalasi untuk pengisian invoice cepat.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5">
            <Upload size={14} className="text-sky-700" />
            <span>Impor CSV / Excel</span>
            <input type="file" accept=".csv, .xlsx, .xls" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={handleExport}
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
            <span>Tambah Item Baru</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode SKU, nama barang, atau deskripsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Kategori:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-3.5">Kode SKU</th>
                <th className="py-3 px-3.5">Nama Produk / Jasa</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Satuan</th>
                <th className="py-3 px-3.5 text-right">Harga Default</th>
                <th className="py-3 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3.5 font-mono font-bold text-sky-950">{p.code}</td>
                  <td className="py-3 px-3.5">
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    {p.description && (
                      <div className="text-[11px] text-slate-500 line-clamp-1">{p.description}</div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{p.unit}</td>
                  <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {formatCurrency(p.defaultPrice, 'IDR')}
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded"
                        title="Edit Item"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    Tidak ada item katalog ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProduct ? 'Edit Item Katalog' : 'Tambah Produk / Jasa Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode SKU *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="Contoh: NET-CAT-24"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Hardware, Jasa, Kabel, dll."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Produk / Jasa *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama barang atau paket jasa"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan *</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="Unit">Unit</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Roll">Roll</option>
                    <option value="Box">Box</option>
                    <option value="Meter">Meter</option>
                    <option value="Paket">Paket</option>
                    <option value="Hari">Hari</option>
                    <option value="Jam">Jam</option>
                    <option value="Lot">Lot</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Satuan Default (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.defaultPrice}
                    onChange={(e) => setForm({ ...form, defaultPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-right tabular-nums"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Lengkap</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Spesifikasi teknis, garansi, atau cakupan pekerjaan..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
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
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
