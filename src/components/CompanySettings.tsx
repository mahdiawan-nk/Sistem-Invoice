import React, { useState } from 'react';
import { CompanyProfile, BankAccount } from '../types';
import { dataService } from '../services/dataService';
import {
  Building2,
  Plus,
  Trash2,
  Upload,
  Check,
  CreditCard,
  Image as ImageIcon,
  Save,
} from 'lucide-react';

interface CompanySettingsProps {
  companies: CompanyProfile[];
  onCompanyUpdated: () => void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({
  companies,
  onCompanyUpdated,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    companies[0]?.id || ''
  );

  const activeCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];

  const [form, setForm] = useState<CompanyProfile>({ ...activeCompany });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // When switching company
  const handleSelectCompany = (id: string) => {
    setSelectedCompanyId(id);
    const comp = companies.find((c) => c.id === id);
    if (comp) setForm({ ...comp });
  };

  const handleCreateNewCompany = () => {
    const newComp: CompanyProfile = {
      id: `comp-${Date.now()}`,
      name: 'Perusahaan Baru',
      slogan: 'Solusi Bisnis & Layanan Profesional',
      logoUrl: '',
      logoWidth: 160,
      logoPosition: 'left',
      logoMarginBottom: 16,
      address: 'Jl. Bisnis Raya No. 1',
      subdistrict: 'Menteng',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      postalCode: '10310',
      phone: '021-12345678',
      email: 'kontak@perusahaan.co.id',
      website: 'https://www.perusahaan.co.id',
      npwp: '01.234.567.8-012.000',
      picName: 'Nama Manajer Keuangan',
      picRole: 'Finance Lead',
      directorName: 'Nama Direktur',
      directorTitle: 'Direktur Utama',
      brandColor: '#0f2b46',
      accentColor: '#0284c7',
      invoiceNumberFormat: 'INV/{YYYY}/{MM}/{0001}',
      defaultCurrency: 'IDR',
      footerInfo: 'Terima kasih atas kerja sama dan kepercayaan Anda.',
      bankAccounts: [
        {
          id: `bank-${Date.now()}`,
          bankName: 'Bank Central Asia (BCA)',
          accountNumber: '123-456-7890',
          accountHolder: 'PT Perusahaan Baru',
          isPrimary: true,
        },
      ],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataService.saveCompany(newComp);
    onCompanyUpdated();
    setSelectedCompanyId(newComp.id);
    setForm(newComp);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({ ...prev, directorSignatureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Bank accounts management
  const addBankAccount = () => {
    setForm((prev) => ({
      ...prev,
      bankAccounts: [
        ...(prev.bankAccounts || []),
        {
          id: `bank-${Date.now()}`,
          bankName: 'Bank Mandiri',
          accountNumber: '',
          accountHolder: prev.name,
          branch: '',
          isPrimary: false,
        },
      ],
    }));
  };

  const updateBankAccount = (index: number, fields: Partial<BankAccount>) => {
    setForm((prev) => {
      const clone = [...(prev.bankAccounts || [])];
      clone[index] = { ...clone[index], ...fields };
      return { ...prev, bankAccounts: clone };
    });
  };

  const removeBankAccount = (index: number) => {
    setForm((prev) => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    dataService.saveCompany(form);
    onCompanyUpdated();
    setSuccessMessage('Profil perusahaan berhasil disimpan!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteCompany = () => {
    if (companies.length <= 1) {
      alert('Minimal harus ada 1 profil perusahaan dalam sistem.');
      return;
    }
    if (confirm(`Hapus profil perusahaan "${form.name}"?`)) {
      dataService.deleteCompany(form.id);
      onCompanyUpdated();
      setSelectedCompanyId(companies[0].id);
      setForm(companies[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pengaturan Identitas Perusahaan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola profil perusahaan penerbit, logo, tanda tangan direktur, rekening bank, dan format penomoran invoice.
          </p>
        </div>

        <button
          onClick={handleCreateNewCompany}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span>Tambah Profil Perusahaan Baru</span>
        </button>
      </div>

      {/* Company Selector Tab Bar */}
      {companies.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectCompany(c.id)}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                selectedCompanyId === c.id
                  ? 'bg-sky-50 text-sky-950 border-sky-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Building2 size={13} />
              <span>{c.name}</span>
              {c.isDefault && (
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1 rounded">Default</span>
              )}
            </button>
          ))}
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <Check size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Logo & Branding */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Logo & Visual Identitas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Logo Preview */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg min-h-[160px]">
              {form.logoUrl ? (
                <div className="space-y-2 text-center">
                  <img
                    src={form.logoUrl}
                    alt="Logo"
                    style={{ width: `${form.logoWidth || 160}px`, maxHeight: '100px' }}
                    className="object-contain mx-auto"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, logoUrl: '' }))}
                    className="text-[11px] text-rose-600 hover:underline block mx-auto"
                  >
                    Hapus Logo
                  </button>
                </div>
              ) : (
                <div className="text-center text-slate-400 space-y-1">
                  <ImageIcon size={32} className="mx-auto text-slate-300" />
                  <span className="text-xs block">Belum ada logo terunggah</span>
                  <span className="text-[10px] block text-slate-400">
                    (Menggunakan teks Djoeta Project / nama perusahaan sebagai default)
                  </span>
                </div>
              )}
            </div>

            {/* Logo Controls */}
            <div className="md:col-span-8 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unggah Berkas Logo (PNG / JPG / SVG)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lebar Tampilan Logo: {form.logoWidth || 160}px
                  </label>
                  <input
                    type="range"
                    min="80"
                    max="260"
                    step="10"
                    value={form.logoWidth || 160}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, logoWidth: Number(e.target.value) }))
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Posisi Logo pada Invoice
                  </label>
                  <div className="flex gap-2">
                    {(['left', 'center', 'right'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, logoPosition: pos }))}
                        className={`flex-1 py-1 text-xs rounded border capitalize ${
                          form.logoPosition === pos
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pos === 'left' ? 'Kiri' : pos === 'center' ? 'Tengah' : 'Kanan'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warna Identitas Utama
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.brandColor || '#0f2b46'}
                    onChange={(e) => setForm((prev) => ({ ...prev, brandColor: e.target.value }))}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs">{form.brandColor || '#0f2b46'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Company Information */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Data Legal & Kontak Perusahaan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Perusahaan *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Slogan / Deskripsi Singkat
              </label>
              <input
                type="text"
                value={form.slogan || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, slogan: e.target.value }))}
                placeholder="Contoh: Network Infrastructure Solutions"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Lengkap *
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kecamatan
              </label>
              <input
                type="text"
                value={form.subdistrict || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, subdistrict: e.target.value }))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kota / Kabupaten *
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Provinsi *
              </label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Pos
              </label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. Telepon / WA *
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Perusahaan *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Website
              </label>
              <input
                type="text"
                value={form.website || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NPWP Perusahaan
              </label>
              <input
                type="text"
                value={form.npwp || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, npwp: e.target.value }))}
                placeholder="00.000.000.0-000.000"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Signatories & Bank Accounts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Penandatangan & Rekening Bank Resmi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Direktur / Penandatangan *
              </label>
              <input
                type="text"
                value={form.directorName}
                onChange={(e) => setForm((prev) => ({ ...prev, directorName: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jabatan Direktur *
              </label>
              <input
                type="text"
                value={form.directorTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, directorTitle: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Unggah Tanda Tangan Digital (Transparan PNG)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-100 hover:file:bg-slate-200"
              />
              {form.directorSignatureUrl && (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, directorSignatureUrl: undefined }))}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Hapus Tanda Tangan
                </button>
              )}
            </div>
          </div>

          {/* Bank Accounts Section */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <CreditCard size={14} className="text-sky-700" />
                <span>Rekening Bank Penampung Pembayaran</span>
              </div>
              <button
                type="button"
                onClick={addBankAccount}
                className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded border border-sky-200 transition-colors flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Tambah Rekening</span>
              </button>
            </div>

            <div className="space-y-2">
              {(form.bankAccounts || []).map((acc, idx) => (
                <div
                  key={acc.id || idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg items-center"
                >
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={acc.bankName}
                      onChange={(e) => updateBankAccount(idx, { bankName: e.target.value })}
                      placeholder="Nama Bank (e.g. BCA)"
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                      required
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={acc.accountNumber}
                      onChange={(e) => updateBankAccount(idx, { accountNumber: e.target.value })}
                      placeholder="Nomor Rekening"
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                      required
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={acc.accountHolder}
                      onChange={(e) => updateBankAccount(idx, { accountHolder: e.target.value })}
                      placeholder="Atas Nama"
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeBankAccount(idx)}
                      disabled={(form.bankAccounts || []).length <= 1}
                      className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: Defaults & Sequence Format */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Konfigurasi Penomoran & Footer
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format Nomor Invoice Otomatis
              </label>
              <input
                type="text"
                value={form.invoiceNumberFormat}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, invoiceNumberFormat: e.target.value }))
                }
                placeholder="INV/{YYYY}/{MM}/{0001}"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Gunakan pola {'{YYYY}'}, {'{MM}'}, {'{0001}'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mata Uang Default
              </label>
              <select
                value={form.defaultCurrency}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, defaultCurrency: e.target.value }))
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="IDR">IDR (Rupiah Indonesia)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="SGD">SGD (Singapore Dollar)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isDefault: e.target.checked }))
                  }
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Jadikan Sebagai Profil Perusahaan Utama</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Footer Standar
            </label>
            <input
              type="text"
              value={form.footerInfo || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, footerInfo: e.target.value }))}
              placeholder="Terima kasih atas kerja sama Anda..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="flex items-center justify-between pt-2">
          {companies.length > 1 ? (
            <button
              type="button"
              onClick={handleDeleteCompany}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>Hapus Profil Ini</span>
            </button>
          ) : (
            <div></div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Save size={15} />
            <span>Simpan Perubahan Identitas</span>
          </button>
        </div>
      </form>
    </div>
  );
};
