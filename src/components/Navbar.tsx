import React from 'react';
import { CompanyProfile, User } from '../types';
import { NavTab } from './Sidebar';
import { Menu, Plus, Building2 } from 'lucide-react';

interface NavbarProps {
  activeTab: NavTab;
  activeCompany: CompanyProfile;
  currentUser: User;
  onOpenMobile: () => void;
  onCreateInvoice: () => void;
}

const TAB_TITLES: Record<NavTab, string> = {
  dashboard: 'Dashboard Keuangan',
  create_invoice: 'Buat Invoice Baru',
  invoices: 'Semua Invoice & Arsip',
  customers: 'Pengelolaan Pelanggan',
  products: 'Katalog Produk & Jasa',
  payments: 'Buku Pembayaran & Kas',
  reports: 'Rekapitulasi & Laporan',
  layout_builder: 'Template & Layout Builder',
  company_settings: 'Pengaturan Identitas Perusahaan',
  system_settings: 'Pengaturan Sistem & Database',
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  activeCompany,
  currentUser,
  onOpenMobile,
  onCreateInvoice,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
      {/* Zone 1: Mobile Hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-400 hidden sm:inline">Invoice System</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="font-bold text-slate-800 text-sm">{TAB_TITLES[activeTab]}</span>
        </div>
      </div>

      {/* Zone 2: Active Company Badge & Primary CTA */}
      <div className="flex items-center gap-3">
        {/* Active Company Marker */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <Building2 size={13} className="text-sky-700" />
          <span className="font-semibold">{activeCompany?.name || 'Djoeta Project'}</span>
        </div>

        {activeTab !== 'create_invoice' && (
          <button
            onClick={onCreateInvoice}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Buat Invoice</span>
            <span className="sm:hidden">Invoice</span>
          </button>
        )}
      </div>
    </header>
  );
};
