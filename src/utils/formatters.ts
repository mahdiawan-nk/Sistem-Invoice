import * as XLSX from 'xlsx';

/**
 * Format currency to Indonesian Rupiah or selected currency
 */
export function formatCurrency(
  amount: number,
  currency: string = 'IDR',
  withDecimal: boolean = false
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }

  if (currency === 'IDR') {
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: withDecimal ? 2 : 0,
      maximumFractionDigits: withDecimal ? 2 : 0,
    }).format(amount);
    return formatted.replace(/\s+/g, ' ');
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: withDecimal ? 2 : 2,
    maximumFractionDigits: withDecimal ? 2 : 2,
  }).format(amount);
}

/**
 * Format date to standard Indonesian business format
 * 'short' -> '22/10/2026'
 * 'long'  -> '22 Oktober 2026'
 */
export function formatDateIndo(dateStr?: string | Date, style: 'short' | 'long' = 'short'): string {
  if (!dateStr) return '-';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return '-';

  if (style === 'short') {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const day = date.getDate();
  const month = monthsIndo[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Konversi angka ke terbilang Bahasa Indonesia
 * Contoh: 38398240 -> "Tiga Puluh Delapan Juta Tiga Ratus Sembilan Puluh Delapan Ribu Dua Ratus Empat Puluh Rupiah"
 */
export function terbilang(n: number): string {
  if (isNaN(n) || n === 0) return 'Nol Rupiah';

  const angka = Math.floor(Math.abs(n));
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  function toWords(x: number): string {
    if (x < 12) {
      return bilangan[x];
    } else if (x < 20) {
      return toWords(x - 10) + ' Belas';
    } else if (x < 100) {
      return toWords(Math.floor(x / 10)) + ' Puluh ' + toWords(x % 10);
    } else if (x < 200) {
      return 'Seratus ' + toWords(x - 100);
    } else if (x < 1000) {
      return toWords(Math.floor(x / 100)) + ' Ratus ' + toWords(x % 100);
    } else if (x < 2000) {
      return 'Seribu ' + toWords(x - 1000);
    } else if (x < 1000000) {
      return toWords(Math.floor(x / 1000)) + ' Ribu ' + toWords(x % 1000);
    } else if (x < 1000000000) {
      return toWords(Math.floor(x / 1000000)) + ' Juta ' + toWords(x % 1000000);
    } else if (x < 1000000000000) {
      return toWords(Math.floor(x / 1000000000)) + ' Miliar ' + toWords(x % 1000000000);
    } else if (x < 1000000000000000) {
      return toWords(Math.floor(x / 1000000000000)) + ' Triliun ' + toWords(x % 1000000000000);
    }
    return '';
  }

  const result = toWords(angka).replace(/\s+/g, ' ').trim();
  return (n < 0 ? 'Minus ' : '') + result + ' Rupiah';
}

/**
 * Generate formatted invoice number
 * Format example: INV/{YYYY}/{MM}/{0001}
 */
export function generateInvoiceNumber(
  formatPattern: string = 'INV/{YYYY}/{MM}/{0001}',
  sequenceNumber: number = 1,
  date: Date = new Date()
): string {
  const yyyy = String(date.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  let result = formatPattern
    .replace('{YYYY}', yyyy)
    .replace('{YY}', yy)
    .replace('{MM}', mm)
    .replace('{DD}', dd);

  // Match zero-padded sequences like {0001}, {00001}, {001}
  const seqMatch = result.match(/\{(0+1)\}/);
  if (seqMatch) {
    const padLength = seqMatch[1].length;
    const padded = String(sequenceNumber).padStart(padLength, '0');
    result = result.replace(seqMatch[0], padded);
  } else {
    result = result.replace('{SEQ}', String(sequenceNumber));
  }

  return result;
}

/**
 * Export data array to an Excel (.xlsx) file
 */
export function exportToExcel(
  filename: string,
  data: Record<string, any>[],
  sheetName: string = 'Sheet1'
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-width columns
  if (data.length > 0) {
    const colWidths = Object.keys(data[0]).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...data.map((row) => (row[key] !== undefined && row[key] !== null ? String(row[key]).length : 0))
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });
    worksheet['!cols'] = colWidths;
  }

  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Export data array to a CSV file
 */
export function exportToCSV(filename: string, data: Record<string, any>[]) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
