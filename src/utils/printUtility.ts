import { Invoice, CustomColumn } from '../types';
import { formatCurrency, formatDateIndo, terbilang } from './formatters';

/**
 * Universal Print Engine for A4 Invoices.
 * 
 * Works seamlessly whether invoked from:
 * 1. An open live preview (Modal or Create/Edit screen): Clones the exact rendered DOM with 100% fidelity.
 * 2. A headless row action (Invoice List or Dashboard table): Generates a standalone, fully styled
 *    HTML document adhering 100% to the selected Company Profile and Template Layout settings.
 */
export function printInvoice(invoice: Invoice, targetElementOrId?: HTMLElement | string): void {
  // 1. Check if a rendered invoice DOM element is available
  let element: HTMLElement | null = null;
  if (targetElementOrId) {
    element =
      typeof targetElementOrId === 'string'
        ? document.getElementById(targetElementOrId)
        : targetElementOrId;
  }

  if (!element) {
    element =
      document.getElementById('invoice-document-root') ||
      (document.querySelector('.invoice-a4-sheet') as HTMLElement | null);
  }

  // 2. Build printable HTML
  let printDocumentHtml = '';

  if (element) {
    // Clone live DOM element and harvest document stylesheets
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((tag) => tag.outerHTML)
      .join('\n');

    printDocumentHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>${invoice.invoiceNumber || 'Invoice'} - ${invoice.customerSnapshot?.name || 'Customer'}</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          .invoice-a4-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            border-radius: 0 !important;
          }
          .no-print, button {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; max-width: 800px; margin: 0 auto; background: #ffffff;">
          ${element.outerHTML}
        </div>
      </body>
      </html>
    `;
  } else {
    // Generate standalone faithful document
    printDocumentHtml = generateFaithfulPrintHtml(invoice);
  }

  // 3. Inject into hidden isolated iframe to prevent background/modal clutter
  let iframe = document.getElementById('__ims_print_frame__') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = '__ims_print_frame__';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = '0';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(printDocumentHtml);
    iframeDoc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print failed or blocked, falling back to window.print():', err);
        window.print();
      }
    };

    // Ensure all images are fully loaded before opening the print dialog
    const images = iframeDoc.querySelectorAll('img');
    if (images.length > 0) {
      let loadedCount = 0;
      const total = images.length;
      let printTriggered = false;

      const onImageReady = () => {
        loadedCount++;
        if (loadedCount >= total && !printTriggered) {
          printTriggered = true;
          setTimeout(doPrint, 80);
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          onImageReady();
        } else {
          img.onload = onImageReady;
          img.onerror = onImageReady;
        }
      });

      // Safety timeout in case image events stall
      setTimeout(() => {
        if (!printTriggered) {
          printTriggered = true;
          doPrint();
        }
      }, 600);
    } else {
      setTimeout(doPrint, 150);
    }
  } else {
    window.print();
  }
}

/**
 * Generates clean, standalone, print-perfect HTML representation
 * honoring 100% of the invoice's company snapshot and layout snapshot.
 */
function generateFaithfulPrintHtml(invoice: Invoice): string {
  const company = invoice.companySnapshot || {};
  const customer = invoice.customerSnapshot || {};
  const layout = invoice.layoutSnapshot || {};
  const currency = invoice.currency || 'IDR';

  const primaryColor = layout.primaryColor || company.brandColor || '#0f2b46';
  const tableHeaderBg = layout.tableHeaderBg || primaryColor;
  const tableHeaderColor = layout.tableHeaderColor || '#ffffff';
  const tableBorderColor = layout.tableBorderColor || '#cbd5e1';

  const isCenterLogo = layout.logoPosition === 'center';
  const isRightLogo = layout.logoPosition === 'right';
  const logoWidthPx = layout.logoWidth || 160;

  const docTitle =
    invoice.documentTitle || (invoice.documentType === 'quotation' ? 'PENAWARAN HARGA' : 'TAGIHAN KEPADA');

  // Build items rows
  const itemsHtml = (invoice.items || [])
    .map(
      (item, idx) => `
    <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid ${tableBorderColor};">
      <td style="padding: 8px 10px; text-align: center; font-family: monospace; font-size: 11px; color: #64748b;">${idx + 1}</td>
      <td style="padding: 8px 10px; font-family: monospace; font-size: 11px; color: #475569;">${item.code || '-'}</td>
      <td style="padding: 8px 10px; font-weight: 600; color: #0f172a; font-size: 12px;">
        ${item.name}
        ${item.description ? `<div style="font-size: 10px; font-weight: normal; color: #64748b; margin-top: 2px;">${item.description}</div>` : ''}
      </td>
      <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 12px;">${item.qty}</td>
      <td style="padding: 8px 10px; font-size: 11px; color: #475569;">${item.unit || 'Unit'}</td>
      <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 12px;">${formatCurrency(item.unitPrice, currency)}</td>
      <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold; font-size: 12px;">${formatCurrency(item.amount, currency)}</td>
    </tr>
  `
    )
    .join('');

  // Bank accounts HTML
  const bankAccountsHtml = (company.bankAccounts || [])
    .map(
      (acc) => `
    <div style="margin-bottom: 4px; font-size: 11px;">
      <strong style="color: #0f172a;">${acc.bankName}:</strong>
      <span style="font-family: monospace; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; color: #0369a1;">${acc.accountNumber}</span>
      <span style="color: #475569;"> a.n ${acc.accountHolder}</span>
    </div>
  `
    )
    .join('');

  // Header lockup based on logoPosition
  let headerLockupHtml = '';
  if (isCenterLogo) {
    headerLockupHtml = `
      <div style="text-align: center; margin-bottom: 12px;">
        ${
          layout.showLogo !== false
            ? company.logoUrl
              ? `<div style="margin-bottom: 8px;"><img src="${company.logoUrl}" style="max-height: 75px; width: ${logoWidthPx}px; object-fit: contain;" /></div>`
              : `<div style="display: inline-block; padding: 10px 16px; background: ${primaryColor}; color: #ffffff; font-weight: bold; font-size: 18px; border-radius: 8px; margin-bottom: 8px;">${(company.name || 'DP').slice(0, 2).toUpperCase()}</div>`
            : ''
        }
        <div style="font-size: 20px; font-weight: bold; color: ${primaryColor}; line-height: 1.2;">${company.name || 'Djoeta Project'}</div>
        ${company.slogan ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${company.slogan}</div>` : ''}
        
        ${layout.showDocTitle !== false ? `<div style="font-size: 22px; font-weight: 800; color: ${primaryColor}; margin-top: 10px; letter-spacing: 0.5px; text-transform: uppercase;">${docTitle}</div>` : ''}
        
        <div style="margin-top: 6px; font-size: 11.5px; color: #475569;">
          <span>No: <strong>${invoice.invoiceNumber}</strong></span>
          ${layout.showDates !== false ? ` &nbsp;|&nbsp; Tanggal: <strong>${formatDateIndo(invoice.invoiceDate, 'short')}</strong> &nbsp;|&nbsp; Jatuh Tempo: <strong style="color: #b91c1c;">${formatDateIndo(invoice.dueDate, 'short')}</strong>` : ''}
          ${invoice.poNumber ? ` &nbsp;|&nbsp; PO: <strong>${invoice.poNumber}</strong>` : ''}
        </div>
      </div>
    `;
  } else {
    headerLockupHtml = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; ${isRightLogo ? 'flex-direction: row-reverse;' : ''} margin-bottom: 12px;">
        <!-- Logo & Brand Name -->
        <div style="display: flex; align-items: center; gap: 14px;">
          ${
            layout.showLogo !== false
              ? company.logoUrl
                ? `<img src="${company.logoUrl}" style="max-height: 65px; width: ${logoWidthPx}px; object-fit: contain;" />`
                : `<div style="width: 48px; height: 48px; border-radius: 8px; background: ${primaryColor}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">${(company.name || 'DP').slice(0, 2).toUpperCase()}</div>`
              : ''
          }
          <div>
            <div style="font-size: 18px; font-weight: bold; color: ${primaryColor}; line-height: 1.2;">${company.name || 'Djoeta Project'}</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 500;">${company.slogan || 'Network Infrastructure & Enterprise Solutions'}</div>
          </div>
        </div>

        <!-- Document Title & Invoice Meta -->
        <div style="text-align: ${isRightLogo ? 'left' : 'right'};">
          ${layout.showDocTitle !== false ? `<div style="font-size: 22px; font-weight: 800; color: ${primaryColor}; text-transform: uppercase; line-height: 1.1;">${docTitle}</div>` : ''}
          <div style="font-family: monospace; font-weight: bold; font-size: 13px; color: #0f172a; margin-top: 4px;">${invoice.invoiceNumber}</div>
          ${
            layout.showDates !== false
              ? `
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
              Tanggal: <strong>${formatDateIndo(invoice.invoiceDate, 'short')}</strong><br/>
              Jatuh Tempo: <strong style="color: #b91c1c;">${formatDateIndo(invoice.dueDate, 'short')}</strong>
            </div>
          `
              : ''
          }
          ${invoice.poNumber ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">No. PO: <strong>${invoice.poNumber}</strong></div>` : ''}
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${invoice.invoiceNumber} - ${customer.name || 'Invoice'}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 14mm 12mm 14mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: ${
            layout.fontFamily === 'serif'
              ? 'Georgia, serif'
              : layout.fontFamily === 'mono'
              ? 'monospace'
              : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
          };
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: ${layout.fontSizeScale === 'compact' ? '11px' : '12px'};
          line-height: 1.4;
        }
        .header {
          border-bottom: 2px solid ${primaryColor};
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .bill-to-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          border: 1px solid ${tableBorderColor};
          border-radius: 4px;
          overflow: hidden;
        }
        th {
          background-color: ${tableHeaderBg};
          color: ${tableHeaderColor};
          padding: 8px 10px;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .calc-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px 14px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 3.5px 0;
          font-size: 11.5px;
        }
        .avoid-break {
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        ${headerLockupHtml}

        <!-- Company Address -->
        ${
          layout.showCompanyInfo !== false
            ? `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; font-size: 10.5px; color: #475569; display: flex; justify-content: space-between;">
            <div>
              <strong>${company.address || ''}</strong><br/>
              ${[company.subdistrict, company.city, company.province, company.postalCode].filter(Boolean).join(', ')}
            </div>
            <div style="text-align: right;">
              ${company.phone ? `Telp: ${company.phone}` : ''}<br/>
              ${company.email ? `Email: ${company.email}` : ''} | ${company.npwp ? `NPWP: ${company.npwp}` : ''}
              ${company.website ? ` | Web: ${company.website}` : ''}
            </div>
          </div>
        `
            : ''
        }
      </div>

      <!-- Bill To Box -->
      ${
        layout.showCustomerInfo !== false
          ? `
        <div class="bill-to-box">
          <div style="font-size: 9.5px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">
            Ditujukan Kepada:
          </div>
          <div style="display: flex; justify-content: space-between; gap: 20px;">
            <div>
              <div style="font-size: 14px; font-weight: bold; color: #0f172a;">${customer.name || 'Pelanggan'}</div>
              ${customer.contactPerson ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">U.p. <strong>${customer.contactPerson}</strong></div>` : ''}
              <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                ${customer.address || ''}${customer.city ? ', ' + customer.city : ''}
              </div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #475569;">
              ${customer.phone ? `<div>Telp: <strong>${customer.phone}</strong></div>` : ''}
              ${customer.email ? `<div>Email: ${customer.email}</div>` : ''}
              ${customer.npwp ? `<div>NPWP: ${customer.npwp}</div>` : ''}
            </div>
          </div>
        </div>
      `
          : ''
      }

      <!-- Items Table -->
      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">No</th>
            <th style="width: 90px; text-align: left;">Kode</th>
            <th style="text-align: left;">Produk / Jasa</th>
            <th style="width: 50px; text-align: right;">Qty</th>
            <th style="width: 60px; text-align: left;">Satuan</th>
            <th style="width: 105px; text-align: right;">Harga Satuan</th>
            <th style="width: 115px; text-align: right;">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Calculations and Payment Info -->
      <div class="avoid-break" style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 20px;">
        <div style="flex: 1.2;">
          ${
            invoice.grandTotal > 0 && layout.showTerbilang !== false
              ? `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 8px 12px; margin-bottom: 10px; font-size: 11px;">
              <span style="font-size: 9px; font-weight: bold; color: #64748b; display: block; margin-bottom: 2px;">TERBILANG:</span>
              <strong style="color: #0f172a; font-style: italic;"># ${terbilang(invoice.grandTotal)} #</strong>
            </div>
          `
              : ''
          }

          ${
            layout.showPaymentInfo !== false && company.bankAccounts && company.bankAccounts.length > 0
              ? `
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 5px; padding: 10px 12px; font-size: 11px;">
              <strong style="color: #0369a1; display: block; margin-bottom: 6px;">INFORMASI TRANSFER BANK:</strong>
              ${bankAccountsHtml}
            </div>
          `
              : ''
          }

          ${
            layout.showNotes !== false && invoice.notes
              ? `<div style="margin-top: 10px; font-size: 11px; color: #475569;"><strong>Catatan:</strong> ${invoice.notes}</div>`
              : ''
          }
        </div>

        <div style="flex: 0.95;">
          <div class="calc-box">
            <div class="summary-row">
              <span style="color: #64748b;">Subtotal:</span>
              <span style="font-family: monospace; font-weight: 600;">${formatCurrency(invoice.subtotal, currency)}</span>
            </div>
            ${
              invoice.discountTotal > 0
                ? `
              <div class="summary-row" style="color: #10b981;">
                <span>Diskon:</span>
                <span style="font-family: monospace;">- ${formatCurrency(invoice.discountTotal, currency)}</span>
              </div>
            `
                : ''
            }
            ${
              invoice.taxTotal > 0
                ? `
              <div class="summary-row">
                <span style="color: #64748b;">PPN (${invoice.taxRate}%):</span>
                <span style="font-family: monospace;">+ ${formatCurrency(invoice.taxTotal, currency)}</span>
              </div>
            `
                : ''
            }
            ${
              invoice.shippingFee > 0
                ? `
              <div class="summary-row">
                <span style="color: #64748b;">Ongkos Kirim:</span>
                <span style="font-family: monospace;">+ ${formatCurrency(invoice.shippingFee, currency)}</span>
              </div>
            `
                : ''
            }
            <div style="border-top: 1px solid #cbd5e1; margin: 6px 0;"></div>
            <div class="summary-row" style="font-size: 13px; font-weight: bold; color: ${primaryColor};">
              <span>TOTAL TAGIHAN:</span>
              <span style="font-family: monospace; font-size: 14px;">${formatCurrency(invoice.grandTotal, currency, true)}</span>
            </div>
            ${
              invoice.paidAmount > 0
                ? `
              <div class="summary-row" style="color: #10b981; font-size: 11px; margin-top: 4px;">
                <span>Sudah Dibayar:</span>
                <span style="font-family: monospace; font-weight: 600;">${formatCurrency(invoice.paidAmount, currency)}</span>
              </div>
              <div class="summary-row" style="color: #b91c1c; font-size: 12px; font-weight: bold;">
                <span>Sisa Tagihan:</span>
                <span style="font-family: monospace;">${formatCurrency(invoice.balanceDue, currency, true)}</span>
              </div>
            `
                : ''
            }
          </div>
        </div>
      </div>

      <!-- Signature Section -->
      ${
        layout.showSignature !== false
          ? `
        <div class="avoid-break" style="margin-top: 30px; display: flex; justify-content: flex-end;">
          <div style="text-align: center; width: 220px; position: relative;">
            <div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">
              ${company.city || 'Surabaya'}, ${formatDateIndo(invoice.invoiceDate, 'long')}
            </div>
            <div style="font-size: 11px; font-weight: bold; color: #0f172a;">
              ${company.name || 'Djoeta Project'}
            </div>

            <!-- Signature & Stamp Container -->
            <div style="height: 70px; display: flex; align-items: center; justify-content: center; position: relative;">
              ${
                layout.showStamp
                  ? `
                <div style="position: absolute; width: 68px; height: 68px; border-radius: 50%; border: 2px dashed ${primaryColor}; color: ${primaryColor}; opacity: 0.45; transform: rotate(-12deg); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; pointer-events: none;">
                  <div>${(company.name || 'DJOETA').slice(0, 10).toUpperCase()}</div>
                  <div style="font-size: 7px;">LUNAS</div>
                </div>
              `
                  : ''
              }
              ${
                company.directorSignatureUrl
                  ? `<img src="${company.directorSignatureUrl}" style="max-height: 55px; max-width: 150px; object-fit: contain; position: relative; z-index: 2;" />`
                  : `<span style="color: #cbd5e1; font-style: italic; font-size: 11px;">( Tanda Tangan Resmi )</span>`
              }
            </div>

            <div style="border-top: 1px solid #94a3b8; padding-top: 4px;">
              <strong style="font-size: 11px; text-decoration: underline; color: #0f172a;">
                ${layout.signatureName || company.directorName || 'Bambang Pamungkas, S.T.'}
              </strong>
              <div style="font-size: 10px; color: #64748b;">
                ${layout.signatureTitle || company.directorTitle || 'Direktur Utama'}
              </div>
            </div>
          </div>
        </div>
      `
          : ''
      }

      <!-- Footer Info -->
      ${
        layout.showFooter !== false && company.footerInfo
          ? `
        <div style="margin-top: 25px; padding-top: 10px; border-top: 1px solid #f1f5f9; font-size: 10px; color: #94a3b8; font-style: italic;">
          ${company.footerInfo}
        </div>
      `
          : ''
      }
    </body>
    </html>
  `;
}
