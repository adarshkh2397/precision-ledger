import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  IndianRupee, 
  ReceiptText, 
  CalendarDays,
  FileDown,
  MoreHorizontal
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Button } from './ui/Common';
import { formatCurrency, formatDisplayDate } from '../lib/utils';
import { DashboardSummary } from '../types';

export const Dashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSummary(data);
        } else {
          console.error('Failed to fetch summary:', data?.error);
        }
      })
      .catch(err => console.error('Dashboard fetch error:', err));
  }, []);

  if (!summary) return <div className="p-6 text-slate-400 font-headline animate-pulse text-xs">Loading Summary...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Executive Summary</h1>
          <p className="text-slate-400 dark:text-slate-300 font-body mt-1 flex items-center gap-2 text-xs font-medium">
            <CalendarDays size={14} className="text-primary" />
            Performance overview for current cycle
          </p>
        </div>
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit shadow-inner">
          <button className="px-4 py-1.5 bg-white dark:bg-slate-800 shadow-sm rounded-lg text-[10px] font-bold text-primary transition-all">Monthly</button>
          <button className="px-4 py-1.5 text-slate-400 dark:text-slate-300 text-[10px] font-bold hover:text-primary transition-colors">Quarterly</button>
          <button className="px-4 py-1.5 text-slate-400 dark:text-slate-300 text-[10px] font-bold hover:text-primary transition-colors">Yearly</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Gross Sales', value: summary.totalSales, icon: TrendingUp, color: 'primary' },
          { label: 'Total Payables', value: summary.totalPayables, icon: IndianRupee, color: 'error' },
          { label: 'Active Purchases', value: summary.recentPurchases.length, icon: ReceiptText, color: 'secondary' }
        ].map((item, i) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-4 group hover:scale-[1.01] transition-transform duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  item.color === 'primary' ? "bg-primary/10 text-primary" : 
                  item.color === 'error' ? "bg-error/10 text-error" : "bg-secondary/10 text-secondary"
                }`}>
                  <item.icon size={16} strokeWidth={2.5} />
                </div>
              </div>
              <div className="font-label text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 font-bold mb-0.5">{item.label}</div>
              <div className="font-headline text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {typeof item.value === 'number' ? formatCurrency(item.value) : item.value}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <Card className="p-0">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-headline text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Recent Transactions</h2>
              <Button variant="ghost" className="text-[9px] uppercase tracking-widest px-2 py-1" icon={MoreHorizontal}>View All</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="px-6 py-2 font-label text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 font-bold">Invoice #</th>
                    <th className="px-6 py-2 font-label text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-300 font-bold">Supplier</th>
                    <th className="px-6 py-2 font-label text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-300 font-bold">Date</th>
                    <th className="px-6 py-2 font-label text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {summary.recentPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-300 dark:text-slate-300 text-xs font-medium italic">No recent transactions found</td>
                    </tr>
                  ) : (
                    summary.recentPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                        <td className="px-6 py-3 text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">{p.invoice_number}</td>
                        <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-400 font-bold">{p.supplier_name}</td>
                        <td className="px-6 py-3 text-xs text-slate-400 dark:text-slate-300 font-medium">{formatDisplayDate(p.date)}</td>
                        <td className="px-6 py-3 text-xs font-bold tabular-nums text-right text-primary">{formatCurrency(p.grand_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
