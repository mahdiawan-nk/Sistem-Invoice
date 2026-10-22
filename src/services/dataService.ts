import {
  CompanyProfile,
  Customer,
  ProductCatalogItem,
  TemplatePreset,
  Invoice,
  PaymentRecord,
  ActivityLog,
  User,
  CustomColumn,
} from '../types';
import {
  DEFAULT_COMPANIES,
  DEFAULT_CUSTOMERS,
  DEFAULT_PRODUCTS,
  DEFAULT_TEMPLATES,
  DEFAULT_INVOICES,
  DEFAULT_ACTIVITY_LOGS,
  DEFAULT_USERS,
  DEFAULT_CUSTOM_COLUMNS,
} from './mockData';

const STORAGE_KEYS = {
  COMPANIES: 'ims_companies_v1',
  CUSTOMERS: 'ims_customers_v1',
  PRODUCTS: 'ims_products_v1',
  TEMPLATES: 'ims_templates_v1',
  INVOICES: 'ims_invoices_v1',
  CUSTOM_COLUMNS: 'ims_custom_columns_v1',
  PAYMENTS: 'ims_payments_v1',
  ACTIVITY_LOGS: 'ims_activity_logs_v1',
  CURRENT_USER: 'ims_current_user_v1',
  SUPABASE_CONFIG: 'ims_supabase_config_v1',
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

class DataService {
  constructor() {
    this.initStorage();
  }

  private initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.COMPANIES)) {
      localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(DEFAULT_COMPANIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(DEFAULT_INVOICES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOM_COLUMNS)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_COLUMNS, JSON.stringify(DEFAULT_CUSTOM_COLUMNS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(DEFAULT_ACTIVITY_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_USERS[0]));
    }
  }

  // --- Users & Roles ---
  getCurrentUser(): User {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : DEFAULT_USERS[0];
  }

  setCurrentUser(user: User) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  getAllUsers(): User[] {
    return DEFAULT_USERS;
  }

  // --- Companies ---
  getCompanies(): CompanyProfile[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    return raw ? JSON.parse(raw) : [];
  }

  getCompany(id: string): CompanyProfile | undefined {
    return this.getCompanies().find((c) => c.id === id);
  }

  getDefaultCompany(): CompanyProfile {
    const list = this.getCompanies();
    return list.find((c) => c.isDefault) || list[0] || DEFAULT_COMPANIES[0];
  }

  saveCompany(company: CompanyProfile): CompanyProfile {
    const list = this.getCompanies();
    const index = list.findIndex((c) => c.id === company.id);
    const updated = { ...company, updatedAt: new Date().toISOString() };

    if (company.isDefault) {
      list.forEach((c) => (c.isDefault = false));
    }

    if (index >= 0) {
      list[index] = updated;
    } else {
      list.push(updated);
    }

    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(list));
    this.logActivity({
      action: index >= 0 ? 'edit' : 'create',
      description: `${index >= 0 ? 'Memperbarui' : 'Menambahkan'} profil perusahaan "${company.name}".`,
    });
    return updated;
  }

  deleteCompany(id: string): boolean {
    let list = this.getCompanies();
    const target = list.find((c) => c.id === id);
    if (!target) return false;
    list = list.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(list));
    this.logActivity({
      action: 'delete',
      description: `Menghapus profil perusahaan "${target.name}".`,
    });
    return true;
  }

  // --- Customers ---
  getCustomers(): Customer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return raw ? JSON.parse(raw) : [];
  }

  getCustomer(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  saveCustomer(customer: Customer): Customer {
    const list = this.getCustomers();
    const index = list.findIndex((c) => c.id === customer.id);
    const updated = { ...customer, updatedAt: new Date().toISOString() };

    if (index >= 0) {
      list[index] = updated;
    } else {
      list.unshift(updated);
    }

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
    this.logActivity({
      action: index >= 0 ? 'edit' : 'create',
      description: `${index >= 0 ? 'Memperbarui' : 'Menambahkan'} data pelanggan "${customer.name}".`,
    });
    return updated;
  }

  deleteCustomer(id: string): boolean {
    let list = this.getCustomers();
    const target = list.find((c) => c.id === id);
    if (!target) return false;
    list = list.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
    this.logActivity({
      action: 'delete',
      description: `Menghapus pelanggan "${target.name}".`,
    });
    return true;
  }

  // --- Products ---
  getProducts(): ProductCatalogItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  }

  saveProduct(product: ProductCatalogItem): ProductCatalogItem {
    const list = this.getProducts();
    const index = list.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      list[index] = product;
    } else {
      list.unshift(product);
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(list));
    return product;
  }

  deleteProduct(id: string): boolean {
    let list = this.getProducts();
    list = list.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(list));
    return true;
  }

  // --- Templates ---
  getTemplates(): TemplatePreset[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return raw ? JSON.parse(raw) : DEFAULT_TEMPLATES;
  }

  getTemplate(id: string): TemplatePreset | undefined {
    return this.getTemplates().find((t) => t.id === id);
  }

  getDefaultTemplate(): TemplatePreset {
    const list = this.getTemplates();
    return list.find((t) => t.isDefault) || list[0] || DEFAULT_TEMPLATES[0];
  }

  saveTemplate(template: TemplatePreset): TemplatePreset {
    const list = this.getTemplates();
    const index = list.findIndex((t) => t.id === template.id);

    if (template.isDefault) {
      list.forEach((t) => (t.isDefault = false));
    }

    if (index >= 0) {
      list[index] = template;
    } else {
      list.push(template);
    }
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(list));
    return template;
  }

  deleteTemplate(id: string): boolean {
    let list = this.getTemplates();
    // Keep at least one template
    if (list.length <= 1) return false;
    list = list.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(list));
    return true;
  }

  // --- Custom Columns ---
  getCustomColumns(): CustomColumn[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_COLUMNS);
    return raw ? JSON.parse(raw) : DEFAULT_CUSTOM_COLUMNS;
  }

  saveCustomColumns(columns: CustomColumn[]) {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_COLUMNS, JSON.stringify(columns));
  }

  // --- Invoices ---
  getInvoices(includeArchived: boolean = false): Invoice[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const list: Invoice[] = raw ? JSON.parse(raw) : [];

    // Auto-update overdue status if past due date and unpaid
    const today = new Date().toISOString().split('T')[0];
    let changed = false;

    list.forEach((inv) => {
      if (
        inv.status !== 'paid' &&
        inv.status !== 'cancelled' &&
        inv.status !== 'draft' &&
        inv.dueDate &&
        inv.dueDate < today
      ) {
        if (inv.status !== 'overdue') {
          inv.status = 'overdue';
          inv.paymentStatus = 'overdue';
          changed = true;
        }
      }
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));
    }

    if (includeArchived) return list;
    return list.filter((inv) => !inv.isArchived);
  }

  getInvoice(id: string): Invoice | undefined {
    return this.getInvoices(true).find((inv) => inv.id === id);
  }

  getNextInvoiceNumber(companyId?: string): string {
    const company = companyId ? this.getCompany(companyId) : this.getDefaultCompany();
    const format = company?.invoiceNumberFormat || 'INV/{YYYY}/{MM}/{0001}';
    const allInvoices = this.getInvoices(true);
    const count = allInvoices.length + 1;
    return this.formatInvoiceNumber(format, count, new Date());
  }

  private formatInvoiceNumber(pattern: string, seq: number, date: Date): string {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    let out = pattern.replace('{YYYY}', yyyy).replace('{MM}', mm).replace('{DD}', dd);
    const match = out.match(/\{(0+1)\}/);
    if (match) {
      const len = match[1].length;
      out = out.replace(match[0], String(seq).padStart(len, '0'));
    } else {
      out = out.replace('{0001}', String(seq).padStart(4, '0'));
    }
    return out;
  }

  saveInvoice(invoice: Invoice): Invoice {
    const list = this.getInvoices(true);
    const index = list.findIndex((inv) => inv.id === invoice.id);
    const isNew = index < 0;

    // Recalculate balance and payment status
    const paid = (invoice.payments || []).reduce((acc, p) => acc + p.amount, 0);
    const balance = Math.max(0, invoice.grandTotal - paid);

    let paymentStatus = invoice.paymentStatus;
    let docStatus = invoice.status;

    if (invoice.status !== 'cancelled' && invoice.status !== 'draft') {
      if (paid >= invoice.grandTotal && invoice.grandTotal > 0) {
        paymentStatus = 'paid';
        docStatus = 'paid';
      } else if (paid > 0) {
        paymentStatus = 'partial';
        docStatus = 'partial';
      } else {
        const today = new Date().toISOString().split('T')[0];
        if (invoice.dueDate && invoice.dueDate < today) {
          paymentStatus = 'overdue';
          docStatus = 'overdue';
        } else {
          paymentStatus = 'unpaid';
          if (docStatus === 'paid' || docStatus === 'partial') {
            docStatus = 'issued';
          }
        }
      }
    }

    const updated: Invoice = {
      ...invoice,
      paidAmount: paid,
      balanceDue: balance,
      status: docStatus,
      paymentStatus: paymentStatus,
      updatedAt: new Date().toISOString(),
      issuedAt: invoice.status !== 'draft' ? invoice.issuedAt || new Date().toISOString() : undefined,
    };

    if (isNew) {
      list.unshift(updated);
    } else {
      list[index] = updated;
    }

    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));

    this.logActivity({
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      action: isNew ? 'create' : 'edit',
      description: `${isNew ? 'Membuat' : 'Memperbarui'} invoice ${updated.invoiceNumber} untuk ${updated.customerSnapshot?.name || 'Pelanggan'}.`,
    });

    return updated;
  }

  archiveInvoice(id: string, isArchived: boolean = true): boolean {
    const list = this.getInvoices(true);
    const inv = list.find((i) => i.id === id);
    if (!inv) return false;
    inv.isArchived = isArchived;
    inv.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));
    this.logActivity({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      action: 'archive',
      description: `${isArchived ? 'Mengarsipkan' : 'Mengembalikan dari arsip'} invoice ${inv.invoiceNumber}.`,
    });
    return true;
  }

  cancelInvoice(id: string, reason?: string): boolean {
    const list = this.getInvoices(true);
    const inv = list.find((i) => i.id === id);
    if (!inv) return false;
    inv.status = 'cancelled';
    inv.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));
    this.logActivity({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      action: 'cancel',
      description: `Membatalkan invoice ${inv.invoiceNumber}${reason ? `: ${reason}` : ''}.`,
    });
    return true;
  }

  deleteDraftInvoice(id: string): boolean {
    let list = this.getInvoices(true);
    const inv = list.find((i) => i.id === id);
    if (!inv) return false;
    if (inv.status !== 'draft') {
      throw new Error('Invoice yang sudah diterbitkan tidak boleh dihapus secara permanen. Gunakan fitur Batalkan atau Arsipkan.');
    }
    list = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));
    this.logActivity({
      action: 'delete',
      description: `Menghapus draft invoice ${inv.invoiceNumber}.`,
    });
    return true;
  }

  // --- Payments ---
  recordPayment(payment: Omit<PaymentRecord, 'id' | 'createdAt'>): PaymentRecord {
    const invoices = this.getInvoices(true);
    const inv = invoices.find((i) => i.id === payment.invoiceId);
    if (!inv) throw new Error('Invoice tidak ditemukan.');

    const newPayment: PaymentRecord = {
      ...payment,
      id: `pay-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    if (!inv.payments) inv.payments = [];
    inv.payments.push(newPayment);

    // Save invoice will recalculate balances & status
    this.saveInvoice(inv);

    this.logActivity({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      action: 'payment',
      description: `Mencatat pembayaran sebesar Rp ${newPayment.amount.toLocaleString('id-ID')} via ${newPayment.paymentMethod} untuk invoice ${inv.invoiceNumber}.`,
    });

    return newPayment;
  }

  cancelPayment(paymentId: string, reason: string): boolean {
    const invoices = this.getInvoices(true);
    let found = false;

    for (const inv of invoices) {
      if (inv.payments && inv.payments.some((p) => p.id === paymentId)) {
        const pmt = inv.payments.find((p) => p.id === paymentId);
        inv.payments = inv.payments.filter((p) => p.id !== paymentId);
        this.saveInvoice(inv);
        found = true;

        this.logActivity({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          action: 'cancel',
          description: `Membatalkan transaksi pembayaran Rp ${pmt?.amount.toLocaleString('id-ID')} pada invoice ${inv.invoiceNumber}: ${reason}.`,
        });
        break;
      }
    }
    return found;
  }

  // --- Activity Logs ---
  getActivityLogs(): ActivityLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
    return raw ? JSON.parse(raw) : [];
  }

  private logActivity(entry: {
    invoiceId?: string;
    invoiceNumber?: string;
    action: ActivityLog['action'];
    description: string;
  }) {
    const list = this.getActivityLogs();
    const currentUser = this.getCurrentUser();
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceId: entry.invoiceId,
      invoiceNumber: entry.invoiceNumber,
      action: entry.action,
      description: entry.description,
      performedBy: currentUser?.name || 'Administrator',
      timestamp: new Date().toISOString(),
    };
    list.unshift(newLog);
    // Keep max 100 logs
    if (list.length > 100) list.pop();
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(list));
  }

  // --- Supabase Config ---
  getSupabaseConfig(): SupabaseConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
    return raw ? JSON.parse(raw) : { url: '', anonKey: '', enabled: false };
  }

  saveSupabaseConfig(config: SupabaseConfig) {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
  }

  // --- Reset & Backup ---
  resetAllData() {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(DEFAULT_COMPANIES));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(DEFAULT_INVOICES));
    localStorage.setItem(STORAGE_KEYS.CUSTOM_COLUMNS, JSON.stringify(DEFAULT_CUSTOM_COLUMNS));
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(DEFAULT_ACTIVITY_LOGS));
  }

  exportFullBackup(): string {
    const dump = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      companies: this.getCompanies(),
      customers: this.getCustomers(),
      products: this.getProducts(),
      templates: this.getTemplates(),
      invoices: this.getInvoices(true),
      customColumns: this.getCustomColumns(),
      activityLogs: this.getActivityLogs(),
    };
    return JSON.stringify(dump, null, 2);
  }

  importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.companies) localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(data.companies));
      if (data.customers) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
      if (data.products) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
      if (data.templates) localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(data.templates));
      if (data.invoices) localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(data.invoices));
      if (data.customColumns) localStorage.setItem(STORAGE_KEYS.CUSTOM_COLUMNS, JSON.stringify(data.customColumns));
      if (data.activityLogs) localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(data.activityLogs));
      return true;
    } catch (e) {
      console.error('Import backup failed', e);
      return false;
    }
  }
}

export const dataService = new DataService();
