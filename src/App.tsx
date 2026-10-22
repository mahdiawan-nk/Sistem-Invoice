/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Invoice,
  CompanyProfile,
  Customer,
  ProductCatalogItem,
  TemplatePreset,
  ActivityLog,
  User,
} from './types';
import { dataService } from './services/dataService';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceCreateEdit } from './components/InvoiceCreateEdit';
import { CustomerManagement } from './components/CustomerManagement';
import { ProductCatalog } from './components/ProductCatalog';
import { PaymentManagement } from './components/PaymentManagement';
import { ReportsView } from './components/ReportsView';
import { LayoutBuilderView } from './components/LayoutBuilderView';
import { CompanySettings } from './components/CompanySettings';
import { SystemSettings } from './components/SystemSettings';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { PaymentModal } from './components/PaymentModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core Data States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [templates, setTemplates] = useState<TemplatePreset[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(dataService.getCurrentUser());

  // Interactive Modals & Edit States
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Load all application data from data service
  const refreshAllData = useCallback(() => {
    setInvoices(dataService.getInvoices(true));
    setCompanies(dataService.getCompanies());
    setCustomers(dataService.getCustomers());
    setProducts(dataService.getProducts());
    setTemplates(dataService.getTemplates());
    setActivityLogs(dataService.getActivityLogs());
    setCurrentUser(dataService.getCurrentUser());
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const activeCompany = companies.find((c) => c.isDefault) || companies[0] || {
    id: 'comp-djoeta',
    name: 'Djoeta Project',
    address: 'Surabaya',
  } as CompanyProfile;

  // Actions
  const handleStartCreateInvoice = () => {
    setEditingInvoice(null);
    setActiveTab('create_invoice');
  };

  const handleEditDraft = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setActiveTab('create_invoice');
  };

  const handleDuplicateInvoice = (invoice: Invoice) => {
    const nextNumber = dataService.getNextInvoiceNumber(invoice.companyId);
    const duplicated: Invoice = {
      ...invoice,
      id: `inv-${Date.now()}`,
      invoiceNumber: nextNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
      })(),
      status: 'draft',
      paymentStatus: 'unpaid',
      paidAmount: 0,
      balanceDue: invoice.grandTotal,
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: undefined,
    };
    setEditingInvoice(duplicated);
    setActiveTab('create_invoice');
  };

  const handleInvoiceSaved = (saved: Invoice) => {
    refreshAllData();
    setPreviewInvoice(saved);
    setActiveTab('invoices');
  };

  const handleCancelInvoice = (id: string) => {
    dataService.cancelInvoice(id, 'Dibatalkan oleh pengguna.');
    refreshAllData();
  };

  const handleArchiveInvoice = (id: string, archive: boolean) => {
    dataService.archiveInvoice(id, archive);
    refreshAllData();
  };

  const handleDeleteDraft = (id: string) => {
    try {
      dataService.deleteDraftInvoice(id);
      refreshAllData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus draft.');
    }
  };

  const handleMarkSent = (inv: Invoice) => {
    const updated = { ...inv, status: 'sent' as const };
    dataService.saveInvoice(updated);
    refreshAllData();
  };

  const handleRecordPayment = (paymentData: any) => {
    dataService.recordPayment(paymentData);
    refreshAllData();
    setPaymentInvoice(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row antialiased text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={(tab) => {
          setActiveTab(tab);
          if (tab === 'create_invoice' && activeTab !== 'create_invoice') {
            setEditingInvoice(null);
          }
        }}
        currentUser={currentUser}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        invoiceCount={invoices.filter((i) => !i.isArchived).length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          activeTab={activeTab}
          activeCompany={activeCompany}
          currentUser={currentUser}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
          onCreateInvoice={handleStartCreateInvoice}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              invoices={invoices}
              companies={companies}
              activityLogs={activityLogs}
              onCreateInvoice={handleStartCreateInvoice}
              onViewInvoice={(inv) => setPreviewInvoice(inv)}
              onRecordPayment={(inv) => setPaymentInvoice(inv)}
            />
          )}

          {activeTab === 'create_invoice' && (
            <InvoiceCreateEdit
              initialInvoice={editingInvoice}
              onSaveSuccess={handleInvoiceSaved}
              onCancel={() => setActiveTab('invoices')}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoiceList
              invoices={invoices}
              companies={companies}
              customers={customers}
              onCreateInvoice={handleStartCreateInvoice}
              onViewInvoice={(inv) => setPreviewInvoice(inv)}
              onEditDraft={handleEditDraft}
              onDuplicateInvoice={handleDuplicateInvoice}
              onRecordPayment={(inv) => setPaymentInvoice(inv)}
              onCancelInvoice={handleCancelInvoice}
              onArchiveInvoice={handleArchiveInvoice}
              onDeleteDraft={handleDeleteDraft}
              onMarkSent={handleMarkSent}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerManagement
              customers={customers}
              invoices={invoices}
              onCustomerUpdated={refreshAllData}
              onViewInvoice={(inv) => setPreviewInvoice(inv)}
            />
          )}

          {activeTab === 'products' && (
            <ProductCatalog
              products={products}
              onProductUpdated={refreshAllData}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentManagement
              invoices={invoices}
              onPaymentUpdated={refreshAllData}
              onViewInvoice={(inv) => setPreviewInvoice(inv)}
              onRecordNewPaymentClick={() => {
                const unpaid = invoices.find((i) => i.balanceDue > 0 && i.status !== 'cancelled');
                if (unpaid) {
                  setPaymentInvoice(unpaid);
                } else {
                  alert('Semua invoice saat ini telah lunas.');
                }
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              invoices={invoices}
              companies={companies}
              customers={customers}
            />
          )}

          {activeTab === 'layout_builder' && (
            <LayoutBuilderView
              templates={templates}
              sampleInvoice={invoices[0] || {} as Invoice}
              onTemplatesUpdated={refreshAllData}
            />
          )}

          {activeTab === 'company_settings' && (
            <CompanySettings
              companies={companies}
              onCompanyUpdated={refreshAllData}
            />
          )}

          {activeTab === 'system_settings' && (
            <SystemSettings
              currentUser={currentUser}
              onUserRoleChanged={(u) => {
                setCurrentUser(u);
                refreshAllData();
              }}
              onDataReset={refreshAllData}
            />
          )}
        </main>
      </div>

      {/* Global Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          isOpen={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onRecordPayment={(inv) => {
            setPreviewInvoice(null);
            setPaymentInvoice(inv);
          }}
          onDuplicate={(inv) => {
            setPreviewInvoice(null);
            handleDuplicateInvoice(inv);
          }}
        />
      )}

      {/* Global Payment Modal */}
      {paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          isOpen={!!paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onPaymentRecorded={handleRecordPayment}
        />
      )}
    </div>
  );
}
