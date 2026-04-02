import React, { useState, useEffect, useRef } from 'react';
import { 
  ReceiptText, 
  Search,
  Filter,
  Download,
  Users,
  CalendarDays,
  FileText,
  Upload
} from 'lucide-react';
import { Card } from './ui/Common';
import { formatCurrency, formatDisplayDate } from '../lib/utils';
import { PurchaseInvoice, Supplier } from '../types';

export const PurchaseHistory = () => {
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchData = async () => {
    try {
      const [purchasesRes, suppliersRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/suppliers')
      ]);
      const purchasesData = await purchasesRes.json();
      const suppliersData = await suppliersRes.json();
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const normalizeRow = (row: any) => {
    const normalized: Record<string, any> = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[key.toString().trim().toLowerCase()] = value;
    });
    return normalized;
  };

  const resolveSupplierId = (row: Record<string, any>) => {
    if (row.supplier_id || row.supplierid) {
      return Number(row.supplier_id || row.supplierid) || 0;
    }
    const supplierName = String(row.supplier_name || row.suppliername || row.name || '').trim();
    const supplier = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
    return supplier?.id || 0;
  };

  const formatImportDate = (value: any) => {
    if (!value && value !== 0) return '';
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'number') {
      const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
      return date.toISOString().split('T')[0];
    }
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().split('T')[0];
  };

  const importPurchasesFromFile = async (file: File) => {
    try {
      setImportMessage('Importing file...');
      const XLSXModule = await import('xlsx');
      const XLSX = (XLSXModule as any).default ?? XLSXModule;
      const data = file.name.endsWith('.csv') ? await file.text() : await file.arrayBuffer();
      const workbook = file.name.endsWith('.csv')
        ? XLSX.read(data, { type: 'string' })
        : XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rows.length) {
        setImportMessage('The file is empty or contains no rows.');
        return;
      }

      const payloads = rows.map((rawRow) => {
        const row = normalizeRow(rawRow);
        const supplier_id = resolveSupplierId(row);
        const taxable_amount = Number(row.taxable_amount || row.taxableamount || 0) || 0;
        const transport_charge = Number(row.transport_charge || row.transportcharge || 0) || 0;
        const gst_percent = Number(row.gst_percent || row.gstpercent || 2.5) || 2.5;
        const cgst_amount = Number(row.cgst_amount || row.cgstamount || row.tax_amount || row.taxamount || 0) || (taxable_amount * gst_percent / 100);
        const sgst_amount = Number(row.sgst_amount || row.sgstamount || row.tax_amount || row.taxamount || 0) || (taxable_amount * gst_percent / 100);
        const gross_total_raw = row.gross_total ?? row.grosstotal;
        const gross_total = gross_total_raw !== undefined && gross_total_raw !== ''
          ? Number(gross_total_raw) || taxable_amount + cgst_amount + sgst_amount
          : taxable_amount + cgst_amount + sgst_amount;
        const grand_total_raw = row.grand_total ?? row.grandtotal;
        const grand_total = grand_total_raw !== undefined && grand_total_raw !== ''
          ? Number(grand_total_raw) || gross_total + transport_charge
          : gross_total + transport_charge;

        return {
          supplier_id,
          invoice_number: String(row.invoice_number || row.invoicenumber || row.invoice || '').trim(),
          date: formatImportDate(row.date || row.invoice_date || row.invoicedate),
          taxable_amount,
          gst_percent,
          cgst_amount,
          sgst_amount,
          tax_amount: cgst_amount + sgst_amount,
          gross_total,
          transport_charge,
          grand_total,
        };
      });

      const validPayloads = payloads.filter((payload) => payload.supplier_id && payload.invoice_number && payload.date && payload.taxable_amount > 0);
      if (!validPayloads.length) {
        setImportMessage('No valid purchase rows found. Ensure supplier_id/supplier_name, invoice_number, date, and taxable_amount are present.');
        return;
      }

      for (const payload of validPayloads) {
        await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      await fetchData();
      setImportMessage(`Imported ${validPayloads.length} purchase row(s).`);
    } catch (error) {
      console.error('Import error:', error);
      setImportMessage('Failed to import the file. Please check the file format and try again.');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importPurchasesFromFile(file);
    event.target.value = '';
  };

  const triggerImport = () => fileInputRef.current?.click();

  const formatPurchaseDate = (dateStr: string) => formatDisplayDate(dateStr);

  const exportCsv = () => {
    if (!filteredPurchases.length) return;

    const headers = [
      'Invoice Number',
      'Supplier',
      'Date',
      'Taxable Amount',
      'GST Rate (%)',
      'CGST Amount',
      'SGST Amount',
      'Tax Amount',
      'Gross Total',
      'Transport Charge',
      'Grand Total',
    ];

    const rows = filteredPurchases.map((p) => {
      const numeric = (value: unknown, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
      };

      return [
        p.invoice_number,
        p.supplier_name,
        formatDisplayDate(p.date),
        numeric(p.taxable_amount).toFixed(2),
        numeric(p.gst_percent, 2.5).toFixed(2),
        numeric(p.cgst_amount).toFixed(2),
        numeric(p.sgst_amount).toFixed(2),
        numeric(p.tax_amount).toFixed(2),
        numeric(p.gross_total).toFixed(2),
        numeric(p.transport_charge).toFixed(2),
        numeric(p.grand_total).toFixed(2),
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `purchase-history-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupplier = selectedSupplier === 'all' || p.supplier_id === selectedSupplier;
    return matchesSearch && matchesSupplier;
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-headline">Purchase History</h2>
          <p className="text-slate-400 dark:text-slate-500 font-medium text-xs">Review and track all supplier invoices and payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </header>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={14} />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs focus:ring-1 focus:ring-primary/20 transition-all" 
                placeholder="Search by invoice or supplier..." 
                type="text"
              />
            </div>
            <div className="relative w-full md:w-64">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={14} />
              <select 
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs focus:ring-1 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerImport}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <Upload size={14} />
              Import CSV/XLSX
            </button>
            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
              <Filter size={16} />
            </button>
          </div>
        </div>
      </Card>
      {importMessage && (
        <div className="px-4 text-sm text-slate-600 dark:text-slate-300">{importMessage}</div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400 text-xs font-medium">Loading purchases...</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <ReceiptText size={48} className="text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-slate-400 text-sm font-medium">No purchase records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Invoice Details</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Supplier</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Taxable Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Tax</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Gross Total</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Transport</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <FileText size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 font-headline leading-tight">{p.invoice_number}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-300 font-bold uppercase tracking-wider mt-0.5">{formatPurchaseDate(p.date)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users size={12} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{p.supplier_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-xs font-medium text-slate-600 dark:text-slate-400">
                      {formatCurrency(p.taxable_amount)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-xs font-medium text-slate-600 dark:text-slate-400">
                      {formatCurrency(p.tax_amount)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-xs font-medium text-slate-600 dark:text-slate-400">
                      {formatCurrency(p.gross_total)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-xs font-medium text-slate-600 dark:text-slate-400">
                      {formatCurrency(p.transport_charge)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      <span className="text-xs font-bold font-headline text-primary">
                        {formatCurrency(p.grand_total)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
