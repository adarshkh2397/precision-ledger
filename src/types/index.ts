export type Page = 'dashboard' | 'purchases' | 'sales' | 'suppliers' | 'history' | 'sales-history' | 'purchase-history';

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  gst_number: string;
  invoice_format?: string;
  current_balance: number;
}

export interface PurchaseInvoice {
  id: number;
  supplier_id: number;
  supplier_name: string;
  invoice_number: string;
  date: string;
  taxable_amount: number;
  tax_amount: number;
  transport_charge: number;
  gross_total: number;
  grand_total: number;
}

export interface LedgerEntry {
  id: number;
  date: string;
  cash_sales: number;
  online_sales: number;
  total_expenses: number;
  net_balance: number;
}

export interface Expense {
  description: string;
  amount: number;
}

export interface DashboardSummary {
  totalSales: number;
  totalPayables: number;
  recentPurchases: PurchaseInvoice[];
}
