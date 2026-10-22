import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, CustomColumn } from '../types';
import { formatCurrency, formatDateIndo, terbilang } from './formatters';

/**
 * Universal high-fidelity PDF generator for invoices.
 * Supports dual-engine execution:
 * 1. DOM Canvas Capture: Captures the exact rendered InvoiceRenderer DOM (100% pixel identical)
 * 2. Vector jsPDF Engine: Pure vector drawing that respects all Company Profile and Template Layout settings
 */
export async function downloadInvoicePDF(
  invoice: Invoice,
  targetOrFilename?: HTMLElement | string,
  customFilename?: string
): Promise<void> {
  let targetElement: HTMLElement | null = null;
  let filename: string;

  // Handle flexible arguments
  if (typeof targetOrFilename === 'string') {
    if (targetOrFilename.toLowerCase().endsWith('.pdf')) {
      filename = targetOrFilename;
    } else {
      targetElement = document.getElementById(targetOrFilename);
      filename = customFilename || generateDefaultFilename(invoice);
    }
  } else if (targetOrFilename instanceof HTMLElement) {
    targetElement = targetOrFilename;
    filename = customFilename || generateDefaultFilename(invoice);
  } else {
    filename = customFilename || generateDefaultFilename(invoice);
  }

  if (!filename.toLowerCase().endsWith('.pdf')) {
    filename += '.pdf';
  }

  // If no explicit element was provided, check if a rendered invoice is currently visible in DOM
  if (!targetElement) {
    targetElement =
      document.getElementById('invoice-document-root') ||
      (document.querySelector('.invoice-a4-sheet') as HTMLElement | null);
  }

  // Strategy 1: If DOM element exists, try high-resolution canvas capture
  if (targetElement) {
    try {
      await captureDomToPdf(targetElement, filename);
      return;
    } catch (err) {
      console.warn('DOM canvas capture failed or timed out, executing native vector PDF generator fallback:', err);
    }
  }

  // Strategy 2: Reliable vector generator honoring all company & template settings
  generateFaithfulNativeInvoicePDF(invoice, filename);
}

// Backwards-compatible alias for existing components
export const generateNativeInvoicePDF = downloadInvoicePDF;

function generateDefaultFilename(invoice: Invoice): string {
  const safeNumber = (invoice.invoiceNumber || 'INV').replace(/[\/\\?%*:|"<>]/g, '_');
  const safeCustomer = (invoice.customerSnapshot?.name || 'Customer').replace(/[\/\\?%*:|"<>]/g, '_');
  return `${safeNumber}_${safeCustomer}.pdf`;
}

/**
 * Capture DOM node to crisp A4 PDF using html2canvas with oklch sanitizer
 */
async function captureDomToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2, // Retina 2x scale for sharp typography and borders
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    onclone: (clonedDoc, clonedEl) => {
      // 1. Sanitize modern color functions (oklch, color, etc.) to standard hex/RGB
      const helperCanvas = clonedDoc.createElement('canvas');
      const ctx = helperCanvas.getContext('2d');

      if (ctx) {
        const allNodes = clonedEl.querySelectorAll('*');
        allNodes.forEach((node) => {
          const el = node as HTMLElement;
          const style = window.getComputedStyle(el);
          const colorProps = [
            'color',
            'backgroundColor',
            'borderColor',
            'borderTopColor',
            'borderRightColor',
            'borderBottomColor',
            'borderLeftColor',
          ];
          colorProps.forEach((prop) => {
            const val = style.getPropertyValue(prop);
            if (val && (val.includes('oklch') || val.includes('color('))) {
              ctx.fillStyle = '#000000';
              ctx.fillStyle = val;
              (el.style as any)[prop] = ctx.fillStyle;
            }
          });
        });
      }

      // 2. Ensure container is styled as clean flat sheet without shadows
      clonedEl.style.boxShadow = 'none';
      clonedEl.style.border = 'none';
      clonedEl.style.margin = '0';
      clonedEl.style.borderRadius = '0';
    },
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printWidth = pdfWidth - margin * 2;
  const printHeight = (canvas.height * printWidth) / canvas.width;

  let heightLeft = printHeight;
  let position = margin;
  let page = 1;

  pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight, undefined, 'FAST');
  heightLeft -= pdfHeight - margin * 2;

  while (heightLeft > 0) {
    position = -(pdfHeight - margin * 2) * page + margin;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight, undefined, 'FAST');
    heightLeft -= pdfHeight - margin * 2;
    page++;
  }

  pdf.save(filename);
}

/**
 * Pure Vector jsPDF Generator: 100% faithful to Company Profile and Template Settings.
 * Works even when no DOM is rendered (e.g. batch download or headless list row click).
 */
export function generateFaithfulNativeInvoicePDF(invoice: Invoice, filename?: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const company = invoice.companySnapshot || {};
  const customer = invoice.customerSnapshot || {};
  const layout = invoice.layoutSnapshot || {};
  const currency = invoice.currency || 'IDR';

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // Colors from layout snapshot or company brand color
  const primaryHex = layout.primaryColor || company.brandColor || '#0f2b46';
  const tableHeaderBgHex = layout.tableHeaderBg || primaryHex;
  const tableHeaderColorHex = layout.tableHeaderColor || '#ffffff';
  const tableBorderColorHex = layout.tableBorderColor || '#cbd5e1';

  const primaryRgb = hexToRgb(primaryHex);
  const headerBgRgb = hexToRgb(tableHeaderBgHex);
  const headerTextRgb = hexToRgb(tableHeaderColorHex);
  const tableBorderRgb = hexToRgb(tableBorderColorHex);

  const fontChoice =
    layout.fontFamily === 'serif' ? 'times' : layout.fontFamily === 'mono' ? 'courier' : 'helvetica';

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      doc.setFont(fontChoice, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`${invoice.invoiceNumber} - ${customer.name || ''}`, margin, currentY);
      currentY += 6;
    }
  };

  const isCenterLogo = layout.logoPosition === 'center';
  const isRightLogo = layout.logoPosition === 'right';
  const logoWidthMm = Math.min(Math.max((layout.logoWidth || 160) * 0.264583, 20), 65); // px to mm

  // Helper for drawing company monogram when no logo image is available
  const drawFallbackEmblem = (x: number, y: number) => {
    doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.roundedRect(x, y, 12, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontChoice, 'bold');
    doc.setFontSize(10);
    const inits = (company.name || 'DP').slice(0, 2).toUpperCase();
    doc.text(inits, x + 3, y + 8);
  };

  // Helper to safely add image to jsPDF
  const safeAddImage = (imgUrl: string, x: number, y: number, w: number, h: number) => {
    try {
      const isPng = imgUrl.includes('image/png') || imgUrl.endsWith('.png');
      doc.addImage(imgUrl, isPng ? 'PNG' : 'JPEG', x, y, w, h, undefined, 'FAST');
      return true;
    } catch (e) {
      console.warn('jsPDF addImage failed:', e);
      return false;
    }
  };

  // 1. TOP HEADER SECTION
  if (isCenterLogo) {
    // CENTERED LOGO LAYOUT (e.g. Quotation or Centered Formal)
    if (layout.showLogo !== false) {
      const logoX = (pageWidth - logoWidthMm) / 2;
      let imgDrawn = false;
      if (company.logoUrl && company.logoUrl.startsWith('data:image')) {
        imgDrawn = safeAddImage(company.logoUrl, logoX, currentY, logoWidthMm, 18);
      }
      if (!imgDrawn) {
        drawFallbackEmblem((pageWidth - 12) / 2, currentY);
        currentY += 14;
      } else {
        currentY += 20;
      }
    }

    // Company Name & Slogan Centered
    doc.setFont(fontChoice, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text(company.name || 'Djoeta Project', pageWidth / 2, currentY + 3, { align: 'center' });

    if (company.slogan) {
      doc.setFont(fontChoice, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(company.slogan, pageWidth / 2, currentY + 7, { align: 'center' });
    }
    currentY += 10;

    // Document Title Centered
    if (layout.showDocTitle !== false) {
      const docTitle =
        invoice.documentTitle || (invoice.documentType === 'quotation' ? 'PENAWARAN HARGA' : 'TAGIHAN KEPADA');
      doc.setFont(fontChoice, 'bold');
      doc.setFontSize(16);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text(docTitle, pageWidth / 2, currentY + 4, { align: 'center' });
      currentY += 8;
    }

    // Meta row centered
    doc.setFont(fontChoice, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const metaStr = [
      `No: ${invoice.invoiceNumber}`,
      layout.showDates !== false ? `Tanggal: ${formatDateIndo(invoice.invoiceDate, 'short')}` : '',
      layout.showDates !== false ? `Jatuh Tempo: ${formatDateIndo(invoice.dueDate, 'short')}` : '',
      invoice.poNumber ? `PO: ${invoice.poNumber}` : '',
    ]
      .filter(Boolean)
      .join('   |   ');
    doc.text(metaStr, pageWidth / 2, currentY + 2, { align: 'center' });
    currentY += 6;
  } else {
    // LEFT OR RIGHT LOGO LAYOUT (e.g. Modern Minimalist or Corporate Classic)
    const logoX = isRightLogo ? pageWidth - margin - logoWidthMm : margin;
    const textX = isRightLogo ? margin : pageWidth - margin;
    const textAlign: 'left' | 'right' = isRightLogo ? 'left' : 'right';

    // Draw Logo
    if (layout.showLogo !== false) {
      let imgDrawn = false;
      if (company.logoUrl && company.logoUrl.startsWith('data:image')) {
        imgDrawn = safeAddImage(company.logoUrl, logoX, currentY, logoWidthMm, 18);
      }
      if (!imgDrawn) {
        drawFallbackEmblem(logoX, currentY);
      }
    }

    // Draw Title & Number on opposite side
    if (layout.showDocTitle !== false) {
      const docTitle =
        invoice.documentTitle || (invoice.documentType === 'quotation' ? 'PENAWARAN HARGA' : 'TAGIHAN KEPADA');
      doc.setFont(fontChoice, 'bold');
      doc.setFontSize(15);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text(docTitle, textX, currentY + 5, { align: textAlign });
    }

    doc.setFont(fontChoice, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(invoice.invoiceNumber, textX, currentY + 10, { align: textAlign });

    if (layout.showDates !== false) {
      doc.setFont(fontChoice, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Tanggal: ${formatDateIndo(invoice.invoiceDate, 'short')}`, textX, currentY + 14.5, { align: textAlign });
      doc.setTextColor(185, 28, 28);
      doc.setFont(fontChoice, 'bold');
      doc.text(`Jatuh Tempo: ${formatDateIndo(invoice.dueDate, 'short')}`, textX, currentY + 18.5, { align: textAlign });
    }

    currentY += 23;
  }

  // Divider Line
  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setLineWidth(0.6);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // Company Address Header
  if (layout.showCompanyInfo !== false) {
    doc.setFont(fontChoice, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    const addr1 = company.address || '';
    const addr2 = [company.subdistrict, company.city, company.province, company.postalCode].filter(Boolean).join(', ');
    const contactLine = [
      company.phone ? `Telp: ${company.phone}` : '',
      company.email ? `Email: ${company.email}` : '',
      company.npwp ? `NPWP: ${company.npwp}` : '',
      company.website ? `Web: ${company.website}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    doc.text(addr1, margin, currentY);
    doc.text(addr2, margin, currentY + 3.5);
    doc.text(contactLine, margin, currentY + 7);
    currentY += 12;
  }

  // 2. CUSTOMER (BILL TO) BOX
  if (layout.showCustomerInfo !== false) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, contentWidth, 20, 1.5, 1.5, 'FD');

    doc.setFont(fontChoice, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('DITUJUKAN KEPADA:', margin + 4, currentY + 4.5);

    doc.setFont(fontChoice, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(customer.name || 'Nama Pelanggan', margin + 4, currentY + 9.5);

    doc.setFont(fontChoice, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const custAddr = `${customer.address || ''}${customer.city ? ', ' + customer.city : ''}`;
    doc.text(custAddr, margin + 4, currentY + 14);

    const rightX = pageWidth - margin - 4;
    if (customer.phone) {
      doc.text(`No. Telp / WA: ${customer.phone}`, rightX, currentY + 9.5, { align: 'right' });
    }
    if (customer.email || customer.npwp) {
      const custSub = [customer.email, customer.npwp ? `NPWP: ${customer.npwp}` : ''].filter(Boolean).join(' | ');
      doc.text(custSub, rightX, currentY + 14, { align: 'right' });
    }
    currentY += 24;
  }

  // 3. ITEMS TABLE
  const tableHeaderHeight = 7;
  const colWidths = {
    no: 9,
    code: 24,
    desc: 75,
    qty: 14,
    unit: 14,
    price: 23,
    total: 23,
  };

  // Header Box
  doc.setFillColor(headerBgRgb.r, headerBgRgb.g, headerBgRgb.b);
  doc.rect(margin, currentY, contentWidth, tableHeaderHeight, 'F');

  doc.setFont(fontChoice, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(headerTextRgb.r, headerTextRgb.g, headerTextRgb.b);

  let curX = margin;
  doc.text('No', curX + 2, currentY + 4.8);
  curX += colWidths.no;

  doc.text('Kode', curX + 1, currentY + 4.8);
  curX += colWidths.code;

  doc.text('Produk / Jasa & Deskripsi', curX + 1, currentY + 4.8);
  curX += colWidths.desc;

  doc.text('Qty', curX + colWidths.qty - 2, currentY + 4.8, { align: 'right' });
  curX += colWidths.qty;

  doc.text('Satuan', curX + 1, currentY + 4.8);
  curX += colWidths.unit;

  doc.text('Harga Satuan', curX + colWidths.price - 2, currentY + 4.8, { align: 'right' });
  curX += colWidths.price;

  doc.text('Jumlah', curX + colWidths.total - 2, currentY + 4.8, { align: 'right' });

  currentY += tableHeaderHeight;

  // Table Rows
  const items = invoice.items || [];
  items.forEach((item, idx) => {
    checkPageBreak(12);

    const isEven = idx % 2 === 1;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, contentWidth, 9, 'F');
    }

    doc.setDrawColor(tableBorderRgb.r, tableBorderRgb.g, tableBorderRgb.b);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + 9, pageWidth - margin, currentY + 9);

    doc.setFont(fontChoice, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    let x = margin;
    doc.text(String(idx + 1), x + 3, currentY + 5.5);
    x += colWidths.no;

    doc.setFont('courier', 'normal');
    doc.text(item.code || '-', x + 1, currentY + 5.5);
    x += colWidths.code;

    doc.setFont(fontChoice, 'bold');
    doc.text(truncateText(item.name, 45), x + 1, currentY + 4);
    doc.setFont(fontChoice, 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(truncateText(item.description || '', 55), x + 1, currentY + 7.5);
    x += colWidths.desc;

    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(String(item.qty), x + colWidths.qty - 2, currentY + 5.5, { align: 'right' });
    x += colWidths.qty;

    doc.text(item.unit || 'Unit', x + 1, currentY + 5.5);
    x += colWidths.unit;

    doc.text(formatCurrency(item.unitPrice, currency), x + colWidths.price - 2, currentY + 5.5, { align: 'right' });
    x += colWidths.price;

    doc.setFont(fontChoice, 'bold');
    doc.text(formatCurrency(item.amount, currency), x + colWidths.total - 2, currentY + 5.5, { align: 'right' });

    currentY += 9;
  });

  currentY += 4;
  checkPageBreak(50);

  // 4. SUMMARY CALCULATION & BANK DETAILS
  const summaryBoxWidth = 75;
  const summaryX = pageWidth - margin - summaryBoxWidth;
  const leftColWidth = contentWidth - summaryBoxWidth - 8;
  let leftY = currentY;

  // Terbilang
  if (layout.showTerbilang !== false && invoice.grandTotal > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, leftY, leftColWidth, 12, 1, 1, 'FD');

    doc.setFont(fontChoice, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('TERBILANG:', margin + 3, leftY + 4);

    doc.setFont(fontChoice, 'bolditalic');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(truncateText(`# ${terbilang(invoice.grandTotal)} #`, 68), margin + 3, leftY + 8.5);
    leftY += 15;
  }

  // Bank Accounts Info
  if (layout.showPaymentInfo !== false && company.bankAccounts && company.bankAccounts.length > 0) {
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(margin, leftY, leftColWidth, 18, 1, 1, 'FD');

    doc.setFont(fontChoice, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(12, 74, 110);
    doc.text('INFORMASI REKENING PEMBAYARAN:', margin + 3, leftY + 4.5);

    doc.setFont(fontChoice, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    let bankY = leftY + 8.5;
    company.bankAccounts.slice(0, 2).forEach((acc) => {
      doc.text(`${acc.bankName}: `, margin + 3, bankY);
      doc.setFont('courier', 'bold');
      doc.text(acc.accountNumber, margin + 28, bankY);
      doc.setFont(fontChoice, 'normal');
      doc.text(` a.n ${acc.accountHolder}`, margin + 58, bankY);
      bankY += 4.5;
    });

    leftY += 21;
  }

  // Notes
  if (layout.showNotes !== false && invoice.notes) {
    doc.setFont(fontChoice, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Catatan:', margin, leftY + 3);
    doc.setFont(fontChoice, 'normal');
    doc.text(truncateText(invoice.notes, 75), margin, leftY + 7);
  }

  // Right Totals Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, currentY, summaryBoxWidth, 38, 1.5, 1.5, 'FD');

  let rowY = currentY + 5;
  const labelX = summaryX + 4;
  const valX = pageWidth - margin - 4;

  const drawLine = (label: string, value: string, bold = false, color?: number[]) => {
    doc.setFont(fontChoice, bold ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    if (color) doc.setTextColor(color[0], color[1], color[2]);
    else doc.setTextColor(71, 85, 105);
    doc.text(label, labelX, rowY);
    doc.text(value, valX, rowY, { align: 'right' });
    rowY += 4.5;
  };

  drawLine('Subtotal:', formatCurrency(invoice.subtotal, currency));
  if (invoice.discountTotal > 0) {
    drawLine('Diskon:', `- ${formatCurrency(invoice.discountTotal, currency)}`, false, [16, 185, 129]);
  }
  if (invoice.taxTotal > 0) {
    drawLine(`PPN (${invoice.taxRate}%):`, `+ ${formatCurrency(invoice.taxTotal, currency)}`);
  }
  if (invoice.shippingFee > 0) {
    drawLine('Ongkos Kirim:', `+ ${formatCurrency(invoice.shippingFee, currency)}`);
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 3, rowY, summaryX + summaryBoxWidth - 3, rowY);
  rowY += 3.5;

  doc.setFont(fontChoice, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text('TOTAL TAGIHAN:', labelX, rowY);
  doc.text(formatCurrency(invoice.grandTotal, currency, true), valX, rowY, { align: 'right' });

  if (invoice.paidAmount > 0) {
    rowY += 4.5;
    drawLine('Sudah Dibayar:', formatCurrency(invoice.paidAmount, currency), false, [16, 185, 129]);
    drawLine('Sisa Tagihan:', formatCurrency(invoice.balanceDue, currency, true), true, [220, 38, 38]);
  }

  currentY = Math.max(leftY, currentY + 42) + 6;
  checkPageBreak(35);

  // 5. SIGNATURE & STAMP SECTION
  if (layout.showSignature !== false) {
    const sigX = pageWidth - margin - 50;
    doc.setFont(fontChoice, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${company.city || 'Surabaya'}, ${formatDateIndo(invoice.invoiceDate, 'long')}`,
      sigX + 25,
      currentY,
      { align: 'center' }
    );

    doc.setFont(fontChoice, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(company.name || 'Djoeta Project', sigX + 25, currentY + 4.5, { align: 'center' });

    currentY += 6;

    // Optional Stamp
    if (layout.showStamp) {
      doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.setLineWidth(0.3);
      doc.circle(sigX + 25, currentY + 10, 9);
      doc.setFont(fontChoice, 'bold');
      doc.setFontSize(5);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text((company.name || 'DJOETA').slice(0, 12), sigX + 25, currentY + 9, { align: 'center' });
      doc.text('LUNAS / RESMI', sigX + 25, currentY + 12, { align: 'center' });
    }

    // Uploaded Signature Image or Line
    let sigDrawn = false;
    if (company.directorSignatureUrl && company.directorSignatureUrl.startsWith('data:image')) {
      sigDrawn = safeAddImage(company.directorSignatureUrl, sigX + 10, currentY, 30, 15);
    }
    currentY += sigDrawn ? 16 : 15;

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(sigX, currentY, sigX + 50, currentY);

    doc.setFont(fontChoice, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(
      layout.signatureName || company.directorName || 'Bambang Pamungkas, S.T.',
      sigX + 25,
      currentY + 4,
      { align: 'center' }
    );

    doc.setFont(fontChoice, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      layout.signatureTitle || company.directorTitle || 'Direktur Utama',
      sigX + 25,
      currentY + 7.5,
      { align: 'center' }
    );
  }

  // Footer Note
  if (layout.showFooter !== false && company.footerInfo) {
    doc.setFont(fontChoice, 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(company.footerInfo, margin, pageHeight - margin + 3);
  }

  // Save the PDF file
  const finalFilename = filename || generateDefaultFilename(invoice);
  doc.save(finalFilename);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '#0f2b46').replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 15, g: 43, b: 70 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function truncateText(str: string, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 2) + '...';
}
