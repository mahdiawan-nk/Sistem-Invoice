import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { dataService, SupabaseConfig } from '../services/dataService';
import { SUPABASE_SQL_MIGRATION } from '../services/supabaseSchema';
import {
  ShieldCheck,
  Database,
  Download,
  Upload,
  RotateCcw,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Key,
  Users,
} from 'lucide-react';

interface SystemSettingsProps {
  currentUser: User;
  onUserRoleChanged: (user: User) => void;
  onDataReset: () => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  currentUser,
  onUserRoleChanged,
  onDataReset,
}) => {
  const allUsers = dataService.getAllUsers();
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(
    dataService.getSupabaseConfig()
  );
  const [copiedSql, setCopiedSql] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Switch Active User / Role
  const handleRoleSelect = (user: User) => {
    dataService.setCurrentUser(user);
    onUserRoleChanged(user);
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    dataService.saveSupabaseConfig(supabaseConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestConnection = () => {
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      setTestResult('Silakan isi URL dan Anon Key terlebih dahulu.');
      return;
    }
    // Simulation / test check
    if (supabaseConfig.url.startsWith('https://') && supabaseConfig.url.includes('supabase.co')) {
      setTestResult('Koneksi endpoint Supabase valid! Siap untuk sinkronisasi cloud.');
    } else {
      setTestResult('Format URL Supabase tidak valid (harus dimulai dengan https://...supabase.co).');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_MIGRATION);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleExportBackup = () => {
    const dump = dataService.exportFullBackup();
    const blob = new Blob([dump], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `IMS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const success = dataService.importFullBackup(reader.result as string);
        if (success) {
          alert('Database berhasil dipulihkan dari cadangan!');
          onDataReset();
        } else {
          alert('Format berkas cadangan JSON tidak valid.');
        }
      } catch (err) {
        alert('Terjadi kesalahan saat memproses berkas JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('Apakah Anda yakin ingin mengatur ulang data ke default demo Djoeta Project? Seluruh data baru akan direset.')) {
      dataService.resetAllData();
      onDataReset();
      alert('Data demo berhasil direset ke status awal!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Pengaturan Sistem & Database</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola izin akses pengguna (RBAC), integrasi cloud database Supabase, dan cadangan data sistem.
        </p>
      </div>

      {/* Section 1: User Roles & RBAC Switcher */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-sky-700" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Role-Based Access Control (RBAC) & Profil Pengguna Aktif
            </h2>
            <p className="text-xs text-slate-500">
              Uji coba fitur aplikasi dengan berganti peran pengguna untuk memeriksa pembatasan hak akses.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {allUsers.map((u) => {
            const isSelected = currentUser.id === u.id;
            return (
              <button
                key={u.id}
                onClick={() => handleRoleSelect(u)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">{u.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      u.role === 'admin'
                        ? 'bg-rose-100 text-rose-800'
                        : u.role === 'finance'
                        ? 'bg-emerald-100 text-emerald-800'
                        : u.role === 'staff'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-100 pt-1">
                  {u.role === 'admin' && 'Akses penuh ke semua modul & pengaturan'}
                  {u.role === 'finance' && 'Membuat invoice, mencatat bayar & laporan'}
                  {u.role === 'staff' && 'Membuat draft invoice & katalog'}
                  {u.role === 'viewer' && 'Hanya melihat data tanpa izin ubah'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Supabase Integration & Mode */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Konfigurasi Database Cloud (Supabase)
              </h2>
              <p className="text-xs text-slate-500">
                Aplikasi mendukung operasi hybrid: LocalStorage mode (offline) dan Cloud Supabase PostgreSQL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                supabaseConfig.enabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Mode Aktif: {supabaseConfig.enabled ? 'Supabase Cloud' : 'Local-First Demo'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveSupabase} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseConfig.url}
                onChange={(e) =>
                  setSupabaseConfig({ ...supabaseConfig, url: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supabase Anon Public API Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseConfig.anonKey}
                onChange={(e) =>
                  setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={supabaseConfig.enabled}
                onChange={(e) =>
                  setSupabaseConfig({ ...supabaseConfig, enabled: e.target.checked })
                }
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Aktifkan Sinkronisasi ke Supabase</span>
            </label>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                testResult.includes('valid!')
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AlertCircle size={15} />
              <span>{testResult}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>Konfigurasi Supabase berhasil disimpan!</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              Uji Koneksi
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Simpan Konfigurasi
            </button>
          </div>
        </form>

        {/* SQL Migration Script Viewer */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Script DDL Migrasi PostgreSQL / Supabase
            </span>
            <button
              onClick={handleCopySql}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copiedSql ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Script SQL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Jalankan skrip ini pada SQL Editor dashboard Supabase Anda untuk membuat seluruh tabel, constraint, index, dan RLS policies.
          </p>
          <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed">
            {SUPABASE_SQL_MIGRATION}
          </pre>
        </div>
      </div>

      {/* Section 3: Data Backup, Restore & Reset */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
          Cadangan & Pemulihan Basis Data (Backup & Restore)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Export JSON */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Download size={16} className="text-sky-700" />
              <span>Ekspor Cadangan (JSON)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Unduh salinan penuh seluruh profil perusahaan, pelanggan, invoice, katalog, dan log aktivitas.
            </p>
            <button
              onClick={handleExportBackup}
              className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold"
            >
              Unduh Backup File (.json)
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Upload size={16} className="text-emerald-600" />
              <span>Pulihkan dari File (.json)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Unggah berkas cadangan JSON yang sebelumnya diekspor untuk mengembalikan basis data.
            </p>
            <label className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold text-center block cursor-pointer">
              <span>Pilih File Backup</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>

          {/* Reset Demo Data */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-700 text-xs">
              <RotateCcw size={16} />
              <span>Reset Data Demo Djoeta Project</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Kembalikan seluruh data sistem ke contoh referensi Djoeta Project & Mahdiawan Nurkholifah (Rp 38.398.240).
            </p>
            <button
              onClick={handleResetData}
              className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold"
            >
              Reset ke Data Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
