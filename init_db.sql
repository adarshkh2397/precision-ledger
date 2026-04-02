-- Precision Ledger PostgreSQL Schema

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
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
  tax_amount NUMERIC(15, 2) DEFAULT 0,
  gross_total NUMERIC(15, 2) DEFAULT 0,
  transport_charge NUMERIC(15, 2) DEFAULT 0,
  grand_total NUMERIC(15, 2) NOT NULL
);

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
