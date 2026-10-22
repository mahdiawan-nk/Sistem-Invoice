import React, { useState, useEffect, useMemo } from 'react';
import {
  Invoice,
  InvoiceItem,
  CompanyProfile,
  Customer,
  ProductCatalogItem,
  TemplatePreset,
  CustomColumn,
  DocumentType,
} from '../types';
import { dataService } from '../services/dataService';
import { InvoiceRenderer } from './InvoiceRenderer';
import { formatCurrency, terbilang } from '../utils/formatters';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { printInvoice } from '../utils/printUtility';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle2,
  Printer,
  Download,
  Eye,
  Sliders,
  Package,
  Layers,
  ArrowLeft,
} from 'lucide-react';

interface InvoiceCreateEditProps {
  initialInvoice?: Invoice | null;
  onSaveSuccess: (invoice: Invoice) => void;
  onCancel: () => void;
}

export const InvoiceCreateEdit: React.FC<InvoiceCreateEditProps> = ({
  initialInvoice,
  onSaveSuccess,
  onCancel,
}) => {
  const companies = useMemo(() => dataService.getCompanies(), []);
  const customers = useMemo(() => dataService.getCustomers(), []);
  const products = useMemo(() => dataService.getProducts(), []);
  const templates = useMemo(() => dataService.getTemplates(), []);

  // Form States
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    initialInvoice?.companyId || companies[0]?.id || 'comp-djoeta'
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialInvoice?.customerId || customers[0]?.id || ''
  );

  const [documentTitle, setDocumentTitle] = useState<string>(
    initialInvoice?.documentTitle || 'TAGIHAN KEPADA'
  );
  const [documentType, setDocumentType] = useState<DocumentType>(
    initialInvoice?.documentType || 'invoice'
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    initialInvoice?.invoiceNumber || dataService.getNextInvoiceNumber(selectedCompanyId)
  );

  const [invoiceDate, setInvoiceDate] = useState<string>(
    initialInvoice?.invoiceDate || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(() => {
    if (initialInvoice?.dueDate) return initialInvoice.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  const [poNumber, setPoNumber] = useState<string>(initialInvoice?.poNumber || '');
  const [referenceNumber, setReferenceNumber] = useState<string>(
    initialInvoice?.referenceNumber || ''
  );
  const [currency, setCurrency] = useState<string>(initialInvoice?.currency || 'IDR');

  // Items & Custom Columns
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>(() => {
    return initialInvoice?.customColumns || dataService.getCustomColumns();
  });

  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (initialInvoice?.items && initialInvoice.items.length > 0) {
      return initialInvoice.items;
    }
    // Default 1 line item
    return [
      {
        id: `item-${Date.now()}`,
        code: products[0]?.code || 'NET-01',
        name: products[0]?.name || 'MikroTik Router CCR2004',
        description: products[0]?.description || 'Router Core 16 Port Gigabit LAN',
        qty: 1,
        unit: products[0]?.unit || 'Unit',
        unitPrice: products[0]?.defaultPrice || 8850000,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        amount: products[0]?.defaultPrice || 8850000,
      },
    ];
  });

  // Invoice-level adjustments
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    initialInvoice?.discountType || 'fixed'
  );
  const [discountValue, setDiscountValue] = useState<number>(
    initialInvoice?.discountValue || 0
  );
  const [taxRate, setTaxRate] = useState<number>(
    initialInvoice?.taxRate !== undefined ? initialInvoice.taxRate : 11
  ); // PPN 11% default
  const [shippingFee, setShippingFee] = useState<number>(
    initialInvoice?.shippingFee || 0
  );
  const [otherFee, setOtherFee] = useState<number>(initialInvoice?.otherFee || 0);
  const [otherFeeDescription, setOtherFeeDescription] = useState<string>(
    initialInvoice?.otherFeeDescription || ''
  );
  const [rounding, setRounding] = useState<number>(initialInvoice?.rounding || 0);
  const [downPayment, setDownPayment] = useState<number>(
    initialInvoice?.downPayment || 0
  );

  const [notes, setNotes] = useState<string>(
    initialInvoice?.notes ||
      'Pembayaran mohon ditransfer ke rekening bank resmi perusahaan yang tertera. Konfirmasi bukti pembayaran melalui finance.'
  );
  const [paymentTerms, setPaymentTerms] = useState<string>(
    initialInvoice?.paymentTerms ||
      'Jatuh tempo pembayaran adalah 14 hari kalender sejak invoice ini diterbitkan.'
  );

  // Template / Layout Configuration
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialInvoice?.layoutSnapshot?.templateId || templates[0]?.id || 'corporate-classic'
  );

  const [layoutConfig, setLayoutConfig] = useState(
    initialInvoice?.layoutSnapshot || templates[0]?.config
  );

  // Active Tab for layout customizations & mobile view
  const [activeTab, setActiveTab] = useState<'form' | 'layout' | 'preview'>('form');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Selected entities for preview
  const currentCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId) || companies[0];
  }, [companies, selectedCompanyId]);

  const currentCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  // When template changes, apply its config
  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      setLayoutConfig(tmpl.config);
    }
  };

  // Recalculate invoice row amounts and totals
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.amount || 0), 0);
  }, [items]);

  const discountTotal = useMemo(() => {
    if (discountType === 'percentage') {
      return (subtotal * (discountValue || 0)) / 100;
    }
    return Math.min(discountValue || 0, subtotal);
  }, [subtotal, discountType, discountValue]);

  const taxableBase = Math.max(0, subtotal - discountTotal);

  const taxTotal = useMemo(() => {
    if (!taxRate || taxRate <= 0) return 0;
    return Math.round((taxableBase * taxRate) / 100);
  }, [taxableBase, taxRate]);

  const grandTotal = useMemo(() => {
    const raw =
      taxableBase +
      taxTotal +
      (shippingFee || 0) +
      (otherFee || 0) +
      (rounding || 0);
    return Math.max(0, Math.round(raw));
  }, [taxableBase, taxTotal, shippingFee, otherFee, rounding]);

  const paidAmount = initialInvoice?.paidAmount || 0;
  const balanceDue = Math.max(0, grandTotal - paidAmount);

  // Handle item updates
  const updateItem = (index: number, fields: Partial<InvoiceItem>) => {
    setItems((prev) => {
      const clone = [...prev];
      const item = { ...clone[index], ...fields };

      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const itemDisc = Number(item.discountAmount) || 0;
      const itemTax = Number(item.taxAmount) || 0;

      // Item Amount = Qty * Price - Discount + Tax
      item.amount = Math.max(0, qty * unitPrice - itemDisc + itemTax);
      clone[index] = item;
      return clone;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        code: '',
        name: '',
        description: '',
        qty: 1,
        unit: 'Unit',
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        amount: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    setItems((prev) => {
      const clone = [...prev];
      const temp = clone[index];
      clone[index] = clone[targetIdx];
      clone[targetIdx] = temp;
      return clone;
    });
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    updateItem(index, {
      productId: prod.id,
      code: prod.code,
      name: prod.name,
      description: prod.description,
      unit: prod.unit,
      unitPrice: prod.defaultPrice,
      amount: (items[index].qty || 1) * prod.defaultPrice,
    });
  };

  // Build live invoice object for preview and saving
  const currentInvoiceObject: Invoice = useMemo(() => {
    return {
      id: initialInvoice?.id || `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim() || 'INV/DRAFT/0001',
      documentTitle: documentTitle || 'TAGIHAN KEPADA',
      documentType,
      companyId: selectedCompanyId,
      customerId: selectedCustomerId,
      companySnapshot: currentCompany,
      customerSnapshot: currentCustomer,
      layoutSnapshot: layoutConfig,
      items,
      customColumns,
      subtotal,
      discountType,
      discountValue,
      discountTotal,
      taxRate,
      taxTotal,
      shippingFee,
      otherFee,
      otherFeeDescription,
      rounding,
      downPayment,
      grandTotal,
      paidAmount,
      balanceDue,
      currency,
      invoiceDate,
      dueDate,
      poNumber,
      referenceNumber,
      notes,
      paymentTerms,
      status: initialInvoice?.status || 'draft',
      paymentStatus: initialInvoice?.paymentStatus || 'unpaid',
      isArchived: initialInvoice?.isArchived || false,
      payments: initialInvoice?.payments || [],
      createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: initialInvoice?.issuedAt,
    };
  }, [
    initialInvoice,
    invoiceNumber,
    documentTitle,
    documentType,
    selectedCompanyId,
    selectedCustomerId,
    currentCompany,
    currentCustomer,
    layoutConfig,
    items,
    customColumns,
    subtotal,
    discountType,
    discountValue,
    discountTotal,
    taxRate,
    taxTotal,
    shippingFee,
    otherFee,
    otherFeeDescription,
    rounding,
    downPayment,
    grandTotal,
    paidAmount,
    balanceDue,
    currency,
    invoiceDate,
    dueDate,
    poNumber,
    referenceNumber,
    notes,
    paymentTerms,
  ]);

  const handleSave = (statusToSet: 'draft' | 'issued') => {
    if (!selectedCustomerId) {
      alert('Silakan pilih pelanggan terlebih dahulu.');
      return;
    }
    if (items.length === 0 || !items.some((i) => i.name.trim())) {
      alert('Invoice harus memiliki minimal satu barang atau jasa.');
      return;
    }

    const payload: Invoice = {
      ...currentInvoiceObject,
      status: statusToSet,
      paymentStatus: statusToSet === 'issued' ? 'unpaid' : 'unpaid',
      issuedAt: statusToSet === 'issued' ? new Date().toISOString() : undefined,
    };

    const saved = dataService.saveInvoice(payload);
    onSaveSuccess(saved);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const safeFilename = `${invoiceNumber.replace(/[\/\\]/g, '_')}_${currentCustomer?.name || 'Customer'}.pdf`;
      await downloadInvoicePDF(currentInvoiceObject, 'live-invoice-preview-container', safeFilename);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    printInvoice(currentInvoiceObject, 'live-invoice-preview-container');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {initialInvoice ? `Edit Invoice: ${initialInvoice.invoiceNumber}` : 'Buat Invoice Baru'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola rincian tagihan, kalkulasi pajak, dan kustomisasi layout secara real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={15} />
            <span>Simpan Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('issued')}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>Terbitkan Invoice</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Download PDF A4 Resmi"
          >
            <Download size={15} />
            <span>{isGeneratingPdf ? 'Membuat...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Cetak Dokumen Invoice Langsung"
          >
            <Printer size={15} />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-slate-200 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Form Input
        </button>
        <button
          onClick={() => setActiveTab('layout')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'layout' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Tata Letak
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Live Preview
        </button>
      </div>

      {/* Main Split Layout: Form on Left, Sticky A4 Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Section: Form & Layout Builder (Col 7) */}
        <div className={`lg:col-span-6 xl:col-span-6 space-y-6 ${activeTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* Quick Sub-navigation between Form and Layout */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'form' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rincian Tagihan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('layout')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                  activeTab === 'layout' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders size={13} />
                <span>Desain & Template</span>
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Template aktif: <span className="font-semibold text-slate-700">{layoutConfig.templateName}</span>
            </div>
          </div>

          {activeTab === 'layout' ? (
            /* Layout Customizer Tab */
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 shadow-2xs">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Pilih Preset Template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {templates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tmpl.id)}
                      className={`p-3 text-left rounded-lg border text-xs transition-all ${
                        selectedTemplateId === tmpl.id
                          ? 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-600'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="font-bold block mb-0.5">{tmpl.name}</span>
                      <span className="text-[11px] text-slate-500 line-clamp-2">{tmpl.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Posisi Logo
                  </label>
                  <div className="flex gap-2">
                    {(['left', 'center', 'right'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setLayoutConfig({ ...layoutConfig, logoPosition: pos })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded border uppercase ${
                          layoutConfig.logoPosition === pos
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pos === 'left' ? 'Kiri' : pos === 'center' ? 'Tengah' : 'Kanan'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lebar Logo: {layoutConfig.logoWidth}px
                  </label>
                  <input
                    type="range"
                    min="90"
                    max="240"
                    step="10"
                    value={layoutConfig.logoWidth}
                    onChange={(e) =>
                      setLayoutConfig({ ...layoutConfig, logoWidth: Number(e.target.value) })
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Warna Utama
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={layoutConfig.primaryColor}
                      onChange={(e) =>
                        setLayoutConfig({
                          ...layoutConfig,
                          primaryColor: e.target.value,
                          tableHeaderBg: e.target.value,
                        })
                      }
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-xs">{layoutConfig.primaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Font Family
                  </label>
                  <select
                    value={layoutConfig.fontFamily}
                    onChange={(e) =>
                      setLayoutConfig({ ...layoutConfig, fontFamily: e.target.value as any })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="plus-jakarta">Plus Jakarta Sans (Modern)</option>
                    <option value="inter">System Sans (Clean)</option>
                    <option value="serif">Georgia (Formal Serif)</option>
                    <option value="mono">JetBrains Mono (Technical)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Skala Font
                  </label>
                  <select
                    value={layoutConfig.fontSizeScale}
                    onChange={(e) =>
                      setLayoutConfig({ ...layoutConfig, fontSizeScale: e.target.value as any })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="compact">Kompak / Padat</option>
                    <option value="normal">Normal</option>
                    <option value="spacious">Lega / Berjarak</option>
                  </select>
                </div>
              </div>

              {/* Toggles for blocks */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Visibilitas Bagian Dokumen
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layoutConfig.showTerbilang}
                      onChange={(e) =>
                        setLayoutConfig({ ...layoutConfig, showTerbilang: e.target.checked })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>Tampilkan Terbilang Rupiah</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layoutConfig.showPaymentInfo}
                      onChange={(e) =>
                        setLayoutConfig({ ...layoutConfig, showPaymentInfo: e.target.checked })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>Informasi Rekening Bank</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layoutConfig.showSignature}
                      onChange={(e) =>
                        setLayoutConfig({ ...layoutConfig, showSignature: e.target.checked })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>Kolom Tanda Tangan Direktur</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layoutConfig.showStamp}
                      onChange={(e) =>
                        setLayoutConfig({ ...layoutConfig, showStamp: e.target.checked })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>Simulasi Stempel Perusahaan</span>
                  </label>
                </div>
              </div>

              {/* Signatory Names */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Penandatangan
                  </label>
                  <input
                    type="text"
                    value={layoutConfig.signatureName}
                    onChange={(e) =>
                      setLayoutConfig({ ...layoutConfig, signatureName: e.target.value })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan Penandatangan
                  </label>
                  <input
                    type="text"
                    value={layoutConfig.signatureTitle}
                    onChange={(e) =>
                      setLayoutConfig({ ...layoutConfig, signatureTitle: e.target.value })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Main Invoice Form Inputs */
            <div className="space-y-6">
              {/* 1. Header & Metadata Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Perusahaan Penerbit *
                    </label>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pelanggan / Penerima Tagihan *
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-medium"
                    >
                      <option value="">-- Pilih Pelanggan --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.contactPerson ? `(${c.contactPerson})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor Invoice *
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tanggal Invoice *
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tanggal Jatuh Tempo *
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Judul Dokumen
                    </label>
                    <input
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder="TAGIHAN KEPADA"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jenis Dokumen
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="invoice">Invoice Tagihan</option>
                      <option value="quotation">Penawaran (Quotation)</option>
                      <option value="proforma">Proforma Invoice</option>
                      <option value="receipt">Kuitansi Resmi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. PO Pelanggan
                    </label>
                    <input
                      type="text"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="Contoh: PO-2026/08"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. Referensi / Surat
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Contoh: SPK/NET/01"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Dynamic Items Table Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-sky-700" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Daftar Barang & Jasa ({items.length} Item)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle column dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 hidden sm:inline">Kolom:</span>
                      {customColumns.slice(0, 3).map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() =>
                            setCustomColumns(
                              customColumns.map((c) =>
                                c.id === col.id ? { ...c, visible: !c.visible } : c
                              )
                            )
                          }
                          className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                            col.visible
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : 'bg-slate-50 text-slate-500 border-slate-200 line-through'
                          }`}
                        >
                          {col.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addItem}
                      className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Tambah Baris</span>
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center font-mono">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {item.name || 'Item Baru'}
                          </span>
                        </div>

                        {/* Item Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Pindah ke Atas"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(idx, 'down')}
                            disabled={idx === items.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Pindah ke Bawah"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            disabled={items.length <= 1}
                            className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-20 ml-1"
                            title="Hapus Baris"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Line inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        {/* Quick pick from catalog */}
                        <div className="sm:col-span-12">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 shrink-0">
                              Ambil dari Katalog:
                            </span>
                            <select
                              value={item.productId || ''}
                              onChange={(e) => handleSelectProduct(idx, e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
                            >
                              <option value="">-- Pilih Barang / Jasa Tersimpan --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  [{p.code}] {p.name} — Rp {p.defaultPrice.toLocaleString('id-ID')} / {p.unit}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Item Name */}
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Nama Produk / Jasa *
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(idx, { name: e.target.value })}
                            placeholder="Contoh: Cisco Catalyst 2960-X"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 font-medium"
                            required
                          />
                        </div>

                        {/* SKU Code */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Kode SKU
                          </label>
                          <input
                            type="text"
                            value={item.code || ''}
                            onChange={(e) => updateItem(idx, { code: e.target.value })}
                            placeholder="NET-01"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                          />
                        </div>

                        {/* Qty */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Qty *
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={item.qty}
                            onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-right font-mono tabular-nums"
                            required
                          />
                        </div>

                        {/* Satuan */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Satuan
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(idx, { unit: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
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

                        {/* Unit Price */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Harga Satuan (Rp) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-right font-mono tabular-nums"
                            required
                          />
                        </div>

                        {/* Description */}
                        <div className="sm:col-span-8">
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Deskripsi Rinci
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            placeholder="Spesifikasi, detail pekerjaan, atau serial number..."
                            className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>

                        {/* Line Total preview */}
                        <div className="sm:col-span-4 flex items-end justify-end">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Jumlah Baris:</span>
                            <span className="font-mono font-bold text-slate-900 text-xs tabular-nums">
                              {formatCurrency(item.amount, currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-dashed border-slate-300 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Tambah Baris Item Lagi</span>
                  </button>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 mr-2">Subtotal Item:</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(subtotal, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Calculations & Adjustments Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Penyesuaian Biaya, Diskon & Pajak
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Diskon */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Diskon Keseluruhan
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as any)}
                        className="px-2 py-1.5 bg-white border border-slate-300 rounded text-xs shrink-0"
                      >
                        <option value="fixed">Nominal (Rp)</option>
                        <option value="percentage">Persentase (%)</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-right tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Pajak PPN */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pajak Pertambahan Nilai (PPN)
                    </label>
                    <div className="flex gap-2 items-center">
                      <select
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium"
                      >
                        <option value={11}>PPN 11% (Tarif Standar RI)</option>
                        <option value={12}>PPN 12% (Tarif 2025+)</option>
                        <option value={0}>Tanpa Pajak (0%)</option>
                      </select>
                      <span className="font-mono text-xs text-slate-600 shrink-0 tabular-nums">
                        = {formatCurrency(taxTotal, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Ongkir */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ongkos Kirim / Pengiriman (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-right tabular-nums"
                    />
                  </div>

                  {/* Biaya Tambahan Lainnya */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Biaya Lain-Lain (Administrasi / Asuransi)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={otherFeeDescription}
                        onChange={(e) => setOtherFeeDescription(e.target.value)}
                        placeholder="Ket: Asuransi / Packing"
                        className="w-1/2 px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                      <input
                        type="number"
                        min="0"
                        value={otherFee}
                        onChange={(e) => setOtherFee(Number(e.target.value))}
                        className="w-1/2 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-right tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Grand Total Summary Box */}
                <div className="mt-4 p-4 rounded-lg bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block uppercase tracking-wider">
                      Total Tagihan Akhir:
                    </span>
                    <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
                      {formatCurrency(grandTotal, currency, true)}
                    </span>
                  </div>
                  <div className="text-right text-xs text-slate-300 max-w-sm italic">
                    {terbilang(grandTotal)}
                  </div>
                </div>
              </div>

              {/* 4. Notes & Terms Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Invoice
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Syarat & Ketentuan Pembayaran
                  </label>
                  <textarea
                    rows={2}
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Sticky Live A4 Preview (Col 6) */}
        <div
          className={`lg:col-span-6 xl:col-span-6 sticky top-6 ${
            activeTab === 'preview' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="bg-slate-200/80 p-4 sm:p-6 rounded-xl border border-slate-300 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-300">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Eye size={14} className="text-sky-700" />
                <span>Live Dokumen A4 Preview</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Otomatis tersinkronisasi tanpa reload
              </span>
            </div>

            {/* The A4 Sheet DOM Container */}
            <div
              id="live-invoice-preview-container"
              className="transform-gpu transition-all overflow-x-auto flex justify-center"
            >
              <InvoiceRenderer
                invoice={currentInvoiceObject}
                layoutOverride={layoutConfig}
                companyOverride={currentCompany}
                customerOverride={currentCustomer}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
