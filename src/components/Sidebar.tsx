import React from 'react';
import { User } from '../types';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Palette,
  Building2,
  Settings,
  X,
  Shield,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'create_invoice'
  | 'invoices'
  | 'customers'
  | 'products'
  | 'payments'
  | 'reports'
  | 'layout_builder'
  | 'company_settings'
  | 'system_settings';

interface SidebarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  currentUser: User;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  invoiceCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  currentUser,
  isOpenMobile,
  onCloseMobile,
  invoiceCount,
}) => {
  const menuItems: { id: NavTab; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create_invoice', label: 'Buat Invoice', icon: FilePlus },
    { id: 'invoices', label: 'Semua Invoice', icon: FileText, count: invoiceCount },
    { id: 'customers', label: 'Pelanggan', icon: Users },
    { id: 'products', label: 'Produk & Jasa', icon: Package },
    { id: 'payments', label: 'Pembayaran', icon: CreditCard },
    { id: 'reports', label: 'Rekap & Laporan', icon: BarChart3 },
    { id: 'layout_builder', label: 'Template Invoice', icon: Palette },
    { id: 'company_settings', label: 'Pengaturan Perusahaan', icon: Building2 },
    { id: 'system_settings', label: 'Pengaturan Sistem', icon: Settings },
  ];

  const handleItemClick = (id: NavTab) => {
    onNavigate(id);
    onCloseMobile();
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    finance: 'Finance Manager',
    staff: 'Staff Operasional',
    viewer: 'Viewer (Read-only)',
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden no-print"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static no-print ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-white text-base">
              IN
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-tight block leading-tight">
                Invoice System
              </span>
              <span className="text-[10px] text-slate-400">Enterprise Edition</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      isActive ? 'bg-sky-800 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Role Card at Bottom */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs uppercase">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-white block truncate leading-snug">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-sky-400 flex items-center gap-1">
                <Shield size={10} />
                <span>{roleLabels[currentUser.role] || currentUser.role}</span>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
