import React from 'react';
import { Invoice, InvoiceLayoutConfig, CompanyProfile, Customer } from '../types';
import { formatCurrency, formatDateIndo, terbilang } from '../utils/formatters';

interface InvoiceRendererProps {
  invoice: Invoice;
  layoutOverride?: Partial<InvoiceLayoutConfig>;
  companyOverride?: Partial<CompanyProfile>;
  customerOverride?: Partial<Customer>;
  isPrintMode?: boolean;
}

export const InvoiceRenderer: React.FC<InvoiceRendererProps> = ({
  invoice,
  layoutOverride,
  companyOverride,
  customerOverride,
  isPrintMode = false,
}) => {
  const company = { ...(invoice.companySnapshot || {}), ...companyOverride };
  const customer = { ...(invoice.customerSnapshot || {}), ...customerOverride };
  const layout: InvoiceLayoutConfig = {
    ...(invoice.layoutSnapshot || {}),
    ...layoutOverride,
  } as InvoiceLayoutConfig;

  const currency = invoice.currency || 'IDR';
  const primaryColor = layout.primaryColor || '#0f2b46';
  const tableHeaderBg = layout.tableHeaderBg || primaryColor;
  const tableHeaderColor = layout.tableHeaderColor || '#ffffff';
  const tableBorderColor = layout.tableBorderColor || '#cbd5e1';

  // Visible columns from customColumns
  const visibleColumns = (invoice.customColumns || [
    { id: 'col-code', key: 'code', label: 'Kode', visible: true, width: '110px', type: 'text' },
    { id: 'col-name', key: 'name', label: 'Produk / Jasa', visible: true, width: 'auto', type: 'text' },
    { id: 'col-desc', key: 'description', label: 'Deskripsi', visible: true, width: 'auto', type: 'text' },
    { id: 'col-qty', key: 'qty', label: 'Qty', visible: true, width: '60px', type: 'number' },
    { id: 'col-unit', key: 'unit', label: 'Satuan', visible: true, width: '70px', type: 'text' },
    { id: 'col-price', key: 'unitPrice', label: 'Harga Satuan', visible: true, width: '120px', type: 'number' },
    { id: 'col-amount', key: 'amount', label: 'Jumlah', visible: true, width: '130px', type: 'number' },
  ]).filter((c) => c.visible);

  const getLogoJustify = () => {
    if (layout.logoPosition === 'center') return 'justify-center';
    if (layout.logoPosition === 'right') return 'justify-end';
    return 'justify-start';
  };

  const isDjoetaSample = !company.logoUrl && (company.name?.toLowerCase().includes('djoeta') || !company.name);

  const isCenterLogo = layout.logoPosition === 'center';
  const isRightLogo = layout.logoPosition === 'right';

  return (
    <div
      id="invoice-document-root"
      className={`invoice-a4-sheet bg-white text-slate-800 transition-all ${
        isPrintMode
          ? 'w-full p-0 shadow-none'
          : 'mx-auto w-full max-w-[800px] min-h-[1050px] p-8 sm:p-12 shadow-md border border-slate-200 rounded-sm'
      }`}
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily:
          layout.fontFamily === 'serif'
            ? 'Georgia, serif'
            : layout.fontFamily === 'mono'
            ? 'monospace'
            : 'Plus Jakarta Sans, sans-serif',
        fontSize: layout.fontSizeScale === 'compact' ? '12.5px' : layout.fontSizeScale === 'spacious' ? '14.5px' : '13.5px',
      }}
    >
      {/* 1. Header Section: Logo & Document Title */}
      <div className="border-b-2 pb-6 mb-6" style={{ borderColor: primaryColor }}>
        {/* CENTER LOGO LAYOUT */}
        {isCenterLogo ? (
          <div className="text-center space-y-4">
            {layout.showLogo !== false && (
              <div className="flex justify-center">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name || 'Company Logo'}
                    referrerPolicy="no-referrer"
                    style={{ width: `${layout.logoWidth || 160}px`, maxHeight: '90px' }}
                    className="object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-xl tracking-wider shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {(company.name || 'DP').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                        {company.name || 'Djoeta Project'}
                      </h1>
                      <p className="text-xs text-slate-500 font-medium">
                        {company.slogan || 'Network & IT Infrastructure Solutions'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {layout.showDocTitle !== false && (
              <h2
                className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase"
                style={{ color: primaryColor }}
              >
                {invoice.documentTitle || (invoice.documentType === 'quotation' ? 'PENAWARAN HARGA' : 'TAGIHAN KEPADA')}
              </h2>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <div>
                <span className="text-slate-500">No: </span>
                <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
              </div>
              {layout.showDates !== false && (
                <>
                  <div>
                    <span className="text-slate-500">Tanggal: </span>
                    <span className="tabular-nums font-medium text-slate-800">{formatDateIndo(invoice.invoiceDate, 'short')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Jatuh Tempo: </span>
                    <span className="tabular-nums font-semibold text-rose-700">{formatDateIndo(invoice.dueDate, 'short')}</span>
                  </div>
                </>
              )}
              {invoice.poNumber && (
                <div>
                  <span className="text-slate-500">PO: </span>
                  <span className="font-mono text-slate-800">{invoice.poNumber}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* LEFT OR RIGHT LOGO LAYOUT */
          <div className={`flex flex-col sm:flex-row items-start justify-between gap-6 ${isRightLogo ? 'sm:flex-row-reverse' : ''}`}>
            {/* Logo & Company Lockup */}
            {layout.showLogo !== false && (
              <div className={`flex items-center ${isRightLogo ? 'justify-end' : 'justify-start'} max-w-md`}>
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name || 'Company Logo'}
                    referrerPolicy="no-referrer"
                    style={{ width: `${layout.logoWidth || 160}px`, maxHeight: '90px' }}
                    className="object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-xl tracking-wider shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {(company.name || 'DP').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                        {company.name || 'Djoeta Project'}
                      </h1>
                      <p className="text-xs text-slate-500 font-medium">
                        {company.slogan || 'Network & IT Infrastructure Solutions'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Document Title & Invoice Meta */}
            <div className={isRightLogo ? 'text-left' : 'text-left sm:text-right shrink-0'}>
              {layout.showDocTitle !== false && (
                <h2
                  className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase"
                  style={{ color: primaryColor }}
                >
                  {invoice.documentTitle || (invoice.documentType === 'quotation' ? 'PENAWARAN HARGA' : 'TAGIHAN KEPADA')}
                </h2>
              )}
              <div className="mt-2 space-y-1 text-xs sm:text-sm">
                <div className={`flex ${isRightLogo ? '' : 'sm:justify-end'} gap-2`}>
                  <span className="text-slate-500">No. Invoice:</span>
                  <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber || 'INV/DRAFT/0000'}</span>
                </div>
                {layout.showDates !== false && (
                  <>
                    <div className={`flex ${isRightLogo ? '' : 'sm:justify-end'} gap-2`}>
                      <span className="text-slate-500">Tanggal:</span>
                      <span className="tabular-nums font-medium text-slate-800">
                        {formatDateIndo(invoice.invoiceDate, 'short')}
                      </span>
                    </div>
                    <div className={`flex ${isRightLogo ? '' : 'sm:justify-end'} gap-2`}>
                      <span className="text-slate-500">Jatuh Tempo:</span>
                      <span className="tabular-nums font-semibold text-rose-700">
                        {formatDateIndo(invoice.dueDate, 'short')}
                      </span>
                    </div>
                  </>
                )}
                {invoice.poNumber && (
                  <div className={`flex ${isRightLogo ? '' : 'sm:justify-end'} gap-2`}>
                    <span className="text-slate-500">No. PO:</span>
                    <span className="font-mono text-slate-800">{invoice.poNumber}</span>
                  </div>
                )}
                {invoice.referenceNumber && (
                  <div className={`flex ${isRightLogo ? '' : 'sm:justify-end'} gap-2`}>
                    <span className="text-slate-500">No. Referensi:</span>
                    <span className="font-mono text-slate-800">{invoice.referenceNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Company Address & Info Header */}
        {layout.showCompanyInfo !== false && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap justify-between gap-4 text-xs text-slate-600">
            <div className="max-w-md">
              <p className="font-medium text-slate-900">{company.address}</p>
              <p>
                {[company.subdistrict, company.city, company.province, company.postalCode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
            <div className="text-left sm:text-right space-y-0.5">
              {company.phone && <p>Telp: <span className="tabular-nums font-medium">{company.phone}</span></p>}
              {company.email && <p>Email: <span className="font-medium">{company.email}</span></p>}
              {company.npwp && <p>NPWP: <span className="font-mono font-medium">{company.npwp}</span></p>}
              {company.website && <p>Web: <span className="text-slate-700">{company.website}</span></p>}
            </div>
          </div>
        )}
      </div>

      {/* 2. Customer Section (Bill To) */}
      {layout.showCustomerInfo !== false && (
        <div className="mb-6 p-4 rounded-md bg-slate-50/80 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="max-w-md">
              <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">
                Ditujukan Kepada:
              </p>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {customer.name || 'Nama Pelanggan / Perusahaan'}
              </h3>
              {customer.contactPerson && customer.contactPerson !== customer.name && (
                <p className="text-xs text-slate-600 mt-0.5">
                  U.p. <span className="font-semibold">{customer.contactPerson}</span>
                </p>
              )}
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {customer.address}
              </p>
              <p className="text-xs text-slate-600">
                {[customer.city, customer.province, customer.postalCode].filter(Boolean).join(', ')}
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-600 space-y-1 sm:self-end">
              {customer.phone && (
                <p>
                  No. Telepon / WA: <span className="font-medium text-slate-800 tabular-nums">{customer.phone}</span>
                </p>
              )}
              {customer.email && (
                <p>
                  Email: <span className="font-medium text-slate-800">{customer.email}</span>
                </p>
              )}
              {customer.npwp && (
                <p>
                  NPWP Pelanggan: <span className="font-mono font-medium text-slate-800">{customer.npwp}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Dynamic Items Table */}
      <div className="mb-6 overflow-hidden rounded-md border" style={{ borderColor: tableBorderColor }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr style={{ backgroundColor: tableHeaderBg, color: tableHeaderColor }}>
              <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider w-10 text-center">No</th>
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  className={`py-2.5 px-3 text-xs font-semibold uppercase tracking-wider ${
                    col.type === 'number' ? 'text-right' : 'text-left'
                  }`}
                  style={{ width: col.width || 'auto' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
            {(invoice.items || []).map((item, idx) => (
              <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>
                {visibleColumns.map((col) => {
                  if (col.key === 'code') {
                    return (
                      <td key={col.id} className="py-2.5 px-3 font-mono text-xs text-slate-600">
                        {item.code || '-'}
                      </td>
                    );
                  }
                  if (col.key === 'name') {
                    return (
                      <td key={col.id} className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.name}
                        {/* Sub description if not using separate column */}
                        {!visibleColumns.some((c) => c.key === 'description') && item.description && (
                          <div className="text-xs font-normal text-slate-500 mt-0.5">{item.description}</div>
                        )}
                      </td>
                    );
                  }
                  if (col.key === 'description') {
                    return (
                      <td key={col.id} className="py-2.5 px-3 text-slate-600 text-xs">
                        {item.description || '-'}
                      </td>
                    );
                  }
                  if (col.key === 'qty') {
                    return (
                      <td key={col.id} className="py-2.5 px-3 text-right font-medium text-slate-800 tabular-nums">
                        {item.qty}
                      </td>
                    );
                  }
                  if (col.key === 'unit') {
                    return (
                      <td key={col.id} className="py-2.5 px-3 text-left text-slate-600 text-xs">
                        {item.unit || 'Unit'}
                      </td>
                    );
                  }
                  if (col.key === 'unitPrice') {
                    return (
                      <td key={col.id} className="py-2.5 px-3 text-right font-mono text-slate-800 tabular-nums">
                        {formatCurrency(item.unitPrice, currency)}
                      </td>
                    );
                  }
                  if (col.key === 'discountAmount') {
                    return (
                      <td key={col.id} className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                        {item.discountAmount ? formatCurrency(item.discountAmount, currency) : '-'}
                      </td>
                    );
                  }
                  if (col.key === 'taxAmount') {
                    return (
                      <td key={col.id} className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                        {item.taxAmount ? formatCurrency(item.taxAmount, currency) : '-'}
                      </td>
                    );
                  }
                  if (col.key === 'amount') {
                    return (
                      <td key={col.id} className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(item.amount, currency)}
                      </td>
                    );
                  }
                  // Custom column fallback
                  const customVal = item.customValues?.[col.key];
                  return (
                    <td
                      key={col.id}
                      className={`py-2.5 px-3 text-slate-700 ${col.type === 'number' ? 'text-right font-mono tabular-nums' : 'text-left'}`}
                    >
                      {customVal !== undefined ? String(customVal) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
            {(!invoice.items || invoice.items.length === 0) && (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-8 text-center text-slate-400 italic">
                  Belum ada item ditambahkan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Calculation Summary & Payment Info Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 mb-6 print-avoid-break">
        {/* Left column: Terbilang, Bank Details & Notes */}
        <div className="sm:col-span-7 space-y-4">
          {/* Terbilang Callout */}
          {layout.showTerbilang !== false && invoice.grandTotal > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wide block mb-0.5">
                Terbilang:
              </span>
              <p className="font-medium italic text-slate-800 leading-snug">
                # {terbilang(invoice.grandTotal)} #
              </p>
            </div>
          )}

          {/* Bank Transfer Details */}
          {layout.showPaymentInfo !== false && company.bankAccounts && company.bankAccounts.length > 0 && (
            <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded text-xs">
              <p className="font-bold text-sky-950 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <span>Informasi Pembayaran / Transfer Bank:</span>
              </p>
              <div className="space-y-1.5 text-slate-700">
                {company.bankAccounts.map((acc, i) => (
                  <div key={acc.id || i} className="font-mono text-xs">
                    <span className="font-bold text-slate-900">{acc.bankName}: </span>
                    <span className="font-bold text-sky-800 bg-sky-100/70 px-1 py-0.5 rounded">{acc.accountNumber}</span>
                    <span className="text-slate-600"> a.n {acc.accountHolder}</span>
                    {acc.branch && <span className="text-slate-400 text-[11px]"> ({acc.branch})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes & Terms */}
          {(layout.showNotes !== false && invoice.notes) || (layout.showPaymentTerms !== false && invoice.paymentTerms) ? (
            <div className="space-y-2 text-xs text-slate-600">
              {layout.showNotes !== false && invoice.notes && (
                <div>
                  <span className="font-semibold text-slate-700">Catatan:</span>
                  <p className="mt-0.5 whitespace-pre-line leading-relaxed text-slate-600">{invoice.notes}</p>
                </div>
              )}
              {layout.showPaymentTerms !== false && invoice.paymentTerms && (
                <div>
                  <span className="font-semibold text-slate-700">Syarat & Ketentuan:</span>
                  <p className="mt-0.5 whitespace-pre-line leading-relaxed text-slate-600">{invoice.paymentTerms}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Right column: Subtotal, Discount, Tax, Total Breakdown */}
        <div className="sm:col-span-5">
          <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-50/50">
            <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between items-center pt-1 text-slate-600">
                <span>Subtotal Barang/Jasa:</span>
                <span className="font-mono font-medium text-slate-800 tabular-nums">
                  {formatCurrency(invoice.subtotal, currency)}
                </span>
              </div>

              {invoice.discountTotal > 0 && (
                <div className="flex justify-between items-center pt-1 text-emerald-700">
                  <span>
                    Diskon {invoice.discountType === 'percentage' ? `(${invoice.discountValue}%)` : ''}:
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    - {formatCurrency(invoice.discountTotal, currency)}
                  </span>
                </div>
              )}

              {invoice.taxTotal > 0 && (
                <div className="flex justify-between items-center pt-1 text-slate-600">
                  <span>Pajak PPN ({invoice.taxRate}%):</span>
                  <span className="font-mono font-medium text-slate-800 tabular-nums">
                    + {formatCurrency(invoice.taxTotal, currency)}
                  </span>
                </div>
              )}

              {invoice.shippingFee > 0 && (
                <div className="flex justify-between items-center pt-1 text-slate-600">
                  <span>Ongkos Kirim / Ekspedisi:</span>
                  <span className="font-mono font-medium text-slate-800 tabular-nums">
                    + {formatCurrency(invoice.shippingFee, currency)}
                  </span>
                </div>
              )}

              {invoice.otherFee > 0 && (
                <div className="flex justify-between items-center pt-1 text-slate-600">
                  <span>Biaya Tambahan {invoice.otherFeeDescription ? `(${invoice.otherFeeDescription})` : ''}:</span>
                  <span className="font-mono font-medium text-slate-800 tabular-nums">
                    + {formatCurrency(invoice.otherFee, currency)}
                  </span>
                </div>
              )}

              {invoice.rounding !== 0 && invoice.rounding !== undefined && (
                <div className="flex justify-between items-center pt-1 text-slate-600">
                  <span>Pembulatan:</span>
                  <span className="font-mono font-medium text-slate-800 tabular-nums">
                    {invoice.rounding > 0 ? '+' : ''}
                    {formatCurrency(invoice.rounding, currency)}
                  </span>
                </div>
              )}

              {/* Grand Total Highlight */}
              <div
                className="flex justify-between items-center pt-2.5 pb-1 font-bold text-sm"
                style={{ color: primaryColor }}
              >
                <span className="uppercase tracking-wide">Total Tagihan:</span>
                <span className="font-mono text-base tabular-nums">
                  {formatCurrency(invoice.grandTotal, currency, true)}
                </span>
              </div>

              {/* Down Payment / Paid / Balance info if applicable */}
              {(invoice.paidAmount > 0 || invoice.downPayment > 0) && (
                <>
                  <div className="flex justify-between items-center pt-1 text-slate-600 text-xs">
                    <span>Sudah Dibayar:</span>
                    <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatCurrency(invoice.paidAmount || invoice.downPayment, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-xs font-bold text-rose-700">
                    <span>Sisa Tagihan:</span>
                    <span className="font-mono text-sm tabular-nums">
                      {formatCurrency(invoice.balanceDue, currency, true)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Signature & Stamp Section */}
      {layout.showSignature !== false && (
        <div className="mt-8 pt-4 flex justify-between items-end border-t border-slate-100 print-avoid-break">
          <div className="text-xs text-slate-400 max-w-xs">
            {layout.showFooter !== false && company.footerInfo && (
              <p className="italic">{company.footerInfo}</p>
            )}
          </div>

          <div className="text-center min-w-[200px] shrink-0">
            <p className="text-xs text-slate-500 mb-1">
              {company.city || 'Surabaya'}, {formatDateIndo(invoice.invoiceDate, 'long')}
            </p>
            <p className="text-xs font-semibold text-slate-700">
              {company.name || 'Djoeta Project'}
            </p>

            {/* Signature Area with optional stamp */}
            <div className="relative h-24 my-1 flex items-center justify-center">
              {/* Optional Company Stamp Simulation */}
              {layout.showStamp && (
                <div
                  className="absolute w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center text-[10px] font-bold uppercase rotate-[-12deg] pointer-events-none opacity-40 select-none"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  <div className="text-center leading-tight">
                    <span>{company.name?.slice(0, 15) || 'DJOETA'}</span>
                    <div className="text-[8px] mt-0.5">LUNAS / RESMI</div>
                  </div>
                </div>
              )}

              {/* Digital signature if uploaded, otherwise realistic professional blank signature line */}
              {company.directorSignatureUrl ? (
                <img
                  src={company.directorSignatureUrl}
                  alt="Tanda Tangan"
                  className="max-h-20 object-contain"
                />
              ) : (
                <div className="italic text-slate-300 text-sm font-serif select-none">
                  ( Tanda Tangan Resmi )
                </div>
              )}
            </div>

            <div className="border-t border-slate-400 pt-1">
              <p className="text-xs font-bold text-slate-900 underline">
                {layout.signatureName || company.directorName || 'Bambang Pamungkas, S.T.'}
              </p>
              <p className="text-[11px] text-slate-600">
                {layout.signatureTitle || company.directorTitle || 'Direktur Utama'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
