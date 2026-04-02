import React, { useState, useEffect } from 'react';
import { 
  ReceiptText, 
  Search,
  Filter,
  Download,
  Users,
  CalendarDays,
  FileText
} from 'lucide-react';
import { Card } from './ui/Common';
import { formatCurrency } from '../lib/utils';
import { PurchaseInvoice, Supplier } from '../types';

export const PurchaseHistory = () => {
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);

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
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
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
            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
              <Filter size={16} />
            </button>
          </div>
        </div>
      </Card>

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
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{p.date}</p>
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
