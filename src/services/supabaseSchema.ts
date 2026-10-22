export const SUPABASE_SQL_MIGRATION = `-- ==============================================================================
-- INVOICE MANAGEMENT SYSTEM - POSTGRESQL / SUPABASE MIGRATION SCRIPT
-- ==============================================================================
-- Includes all required tables: companies, customers, products, invoice_templates,
-- invoices, invoice_items, invoice_payments, invoice_activity_logs, and RLS policies.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slogan TEXT,
  logo_url TEXT,
  logo_width INT DEFAULT 160,
  logo_position VARCHAR(20) DEFAULT 'left',
  address TEXT NOT NULL,
  subdistrict VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  website VARCHAR(150),
  npwp VARCHAR(50),
  pic_name VARCHAR(150),
  pic_role VARCHAR(100),
  director_name VARCHAR(150) NOT NULL,
  director_title VARCHAR(100) NOT NULL,
  director_signature_url TEXT,
  company_stamp_url TEXT,
  brand_color VARCHAR(30) DEFAULT '#0f2b46',
  accent_color VARCHAR(30) DEFAULT '#0284c7',
  invoice_number_format VARCHAR(100) DEFAULT 'INV/{YYYY}/{MM}/{0001}',
  default_currency VARCHAR(10) DEFAULT 'IDR',
  footer_info TEXT,
  bank_accounts JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(150),
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(100),
  npwp VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products & Services Catalog Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) DEFAULT 'Unit',
  default_price NUMERIC(15, 2) DEFAULT 0.00,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Invoice Templates Table
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Invoices Table (with immutable snapshot preservation)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  document_title VARCHAR(100) DEFAULT 'INVOICE',
  document_type VARCHAR(50) DEFAULT 'invoice',
  company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  
  -- Historical Snapshot Data
  company_snapshot JSONB NOT NULL,
  customer_snapshot JSONB NOT NULL,
  layout_snapshot JSONB NOT NULL,
  
  -- Numeric Calculations
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  discount_type VARCHAR(20) DEFAULT 'fixed',
  discount_value NUMERIC(15, 2) DEFAULT 0.00,
  discount_total NUMERIC(15, 2) DEFAULT 0.00,
  tax_rate NUMERIC(5, 2) DEFAULT 11.00,
  tax_total NUMERIC(15, 2) DEFAULT 0.00,
  shipping_fee NUMERIC(15, 2) DEFAULT 0.00,
  other_fee NUMERIC(15, 2) DEFAULT 0.00,
  other_fee_description TEXT,
  rounding NUMERIC(15, 2) DEFAULT 0.00,
  down_payment NUMERIC(15, 2) DEFAULT 0.00,
  grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(15, 2) DEFAULT 0.00,
  balance_due NUMERIC(15, 2) DEFAULT 0.00,
  
  currency VARCHAR(10) DEFAULT 'IDR',
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  po_number VARCHAR(100),
  reference_number VARCHAR(100),
  notes TEXT,
  payment_terms TEXT,
  
  status VARCHAR(50) DEFAULT 'draft',
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  is_archived BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  issued_at TIMESTAMPTZ
);

-- 7. Invoice Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  code VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  qty NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
  unit VARCHAR(50) DEFAULT 'Unit',
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  discount_percent NUMERIC(5, 2) DEFAULT 0.00,
  discount_amount NUMERIC(15, 2) DEFAULT 0.00,
  tax_percent NUMERIC(5, 2) DEFAULT 0.00,
  tax_amount NUMERIC(15, 2) DEFAULT 0.00,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  custom_values JSONB DEFAULT '{}'::jsonb,
  sort_order INT DEFAULT 0
);

-- 8. Invoice Payments Ledger Table
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  destination_bank VARCHAR(150),
  reference_number VARCHAR(100),
  notes TEXT,
  proof_url TEXT,
  recorded_by VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.invoice_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID,
  invoice_number VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  performed_by VARCHAR(150) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_pay_status ON public.invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.invoice_payments(invoice_id);

-- 11. Row Level Security (RLS) Configuration
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_activity_logs ENABLE ROW LEVEL SECURITY;

-- Default Read-Write Policies for authenticated users
CREATE POLICY "Allow authenticated read on companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on companies" ON public.companies FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on invoices" ON public.invoices FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated all on invoice_items" ON public.invoice_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on invoice_payments" ON public.invoice_payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on invoice_activity_logs" ON public.invoice_activity_logs FOR ALL TO authenticated USING (true);
`;
