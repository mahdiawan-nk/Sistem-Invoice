export type UserRole = 'admin' | 'finance' | 'staff' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  companyId?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  isPrimary?: boolean;
}

export interface CompanyProfile {
  id: string;
  name: string;
  slogan?: string;
  logoUrl?: string; // base64 or URL
  logoWidth?: number; // in pixels (default: 160)
  logoPosition?: 'left' | 'center' | 'right';
  logoMarginBottom?: number; // in pixels
  address: string;
  subdistrict?: string; // Kecamatan
  city: string; // Kota / Kabupaten
  province: string; // Provinsi
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  npwp?: string;
  picName: string;
  picRole: string;
  directorName: string;
  directorTitle: string;
  directorSignatureUrl?: string;
  companyStampUrl?: string;
  brandColor?: string; // e.g. #0284c7 or #0f172a
  accentColor?: string;
  invoiceNumberFormat: string; // e.g. "INV/{YYYY}/{MM}/{0001}"
  defaultCurrency: string; // IDR, USD, EUR, SGD
  footerInfo?: string;
  bankAccounts: BankAccount[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  npwp?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string; // Unit, Pcs, Roll, Box, Meter, Paket, Hari, Jam, Lot, etc.
  defaultPrice: number;
  category: string;
  createdAt: string;
}

export interface CustomColumn {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  type: 'text' | 'number';
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  code?: string;
  name: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number; // e.g. 11 for PPN 11%
  taxAmount?: number;
  amount: number; // Subtotal for item
  customValues?: Record<string, string | number>;
}

export type DocumentType = 'invoice' | 'quotation' | 'proforma' | 'receipt';
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface InvoiceLayoutConfig {
  templateId: string;
  templateName: string;
  logoPosition: 'left' | 'center' | 'right';
  logoWidth: number;
  showLogo: boolean;
  showCompanyInfo: boolean;
  showCustomerInfo: boolean;
  showDocTitle: boolean;
  showDates: boolean;
  showPaymentInfo: boolean;
  showSignature: boolean;
  showStamp: boolean;
  showNotes: boolean;
  showPaymentTerms: boolean;
  showFooter: boolean;
  showItemCode: boolean;
  showItemDiscount: boolean;
  showItemTax: boolean;
  fontFamily: 'plus-jakarta' | 'inter' | 'serif' | 'mono';
  fontSizeScale: 'compact' | 'normal' | 'spacious';
  primaryColor: string;
  accentColor: string;
  tableHeaderBg: string;
  tableHeaderColor: string;
  tableBorderColor: string;
  numberFormat: 'id-ID' | 'en-US';
  currencyFormat: 'IDR' | 'USD' | 'EUR';
  showTerbilang: boolean;
  signatureTitle: string;
  signatureName: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'bank_transfer' | 'cash' | 'qris' | 'credit_card' | 'cheque';
  destinationBank: string;
  referenceNumber: string;
  notes?: string;
  proofUrl?: string;
  recordedBy: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  invoiceId?: string;
  invoiceNumber?: string;
  action: 'create' | 'edit' | 'issue' | 'send' | 'payment' | 'cancel' | 'archive' | 'delete';
  description: string;
  performedBy: string;
  timestamp: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  documentTitle: string; // e.g. "TAGIHAN KEPADA", "INVOICE", "FAKTUR PENJUALAN", "PENAWARAN HARGA"
  documentType: DocumentType;
  companyId: string;
  customerId: string;

  // Snapshot copies - historical immutability!
  companySnapshot: CompanyProfile;
  customerSnapshot: Customer;
  layoutSnapshot: InvoiceLayoutConfig;

  items: InvoiceItem[];
  customColumns?: CustomColumn[];

  // Calculation fields
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountTotal: number;
  taxRate: number; // e.g. 11 for PPN 11%, 12 for PPN 12%, or 0
  taxTotal: number;
  shippingFee: number;
  otherFee: number;
  otherFeeDescription?: string;
  rounding: number;
  downPayment: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;

  currency: string;
  invoiceDate: string;
  dueDate: string;
  poNumber?: string;
  referenceNumber?: string;
  notes?: string;
  paymentTerms?: string;

  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  isArchived: boolean;

  payments: PaymentRecord[];

  createdAt: string;
  updatedAt: string;
  issuedAt?: string;
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  config: InvoiceLayoutConfig;
}
