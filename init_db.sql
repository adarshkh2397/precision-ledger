-- Precision Ledger PostgreSQL Schema

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  gst_number TEXT,
  invoice_format TEXT,
  current_balance NUMERIC(15, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  invoice_number TEXT NOT NULL,
  date DATE NOT NULL,
  taxable_amount NUMERIC(15, 2) NOT NULL,
  gst_percent NUMERIC(5, 2) DEFAULT 2.5,
  cgst_amount NUMERIC(15, 2) DEFAULT 0,
  sgst_amount NUMERIC(15, 2) DEFAULT 0,
  tax_amount NUMERIC(15, 2) GENERATED ALWAYS AS (cgst_amount + sgst_amount) STORED,
  gross_total NUMERIC(15, 2) DEFAULT 0,
  transport_charge NUMERIC(15, 2) DEFAULT 0,
  grand_total NUMERIC(15, 2) NOT NULL
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_invoices'
      AND column_name = 'tax_amount'
      AND generation_expression IS NULL
  ) THEN
    UPDATE purchase_invoices
    SET gst_percent = 2.5,
        cgst_amount = COALESCE(tax_amount, 0) / 2,
        sgst_amount = COALESCE(tax_amount, 0) / 2;
    ALTER TABLE purchase_invoices DROP COLUMN tax_amount;
  END IF;

  ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5, 2) DEFAULT 2.5;
  ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(15, 2) DEFAULT 0;
  ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(15, 2) DEFAULT 0;
  ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15, 2) GENERATED ALWAYS AS (cgst_amount + sgst_amount) STORED;
END
$$;

CREATE TABLE IF NOT EXISTS daily_ledger (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  cash_sales NUMERIC(15, 2) DEFAULT 0,
  online_sales NUMERIC(15, 2) DEFAULT 0,
  total_expenses NUMERIC(15, 2) DEFAULT 0,
  net_balance NUMERIC(15, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_expenses (
  id SERIAL PRIMARY KEY,
  ledger_id INTEGER REFERENCES daily_ledger(id),
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  date DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  method TEXT CHECK(method IN ('Cash', 'Cheque'))
);
