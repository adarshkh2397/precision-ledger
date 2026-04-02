import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search,
  Filter,
  Download
} from 'lucide-react';
import { Card } from './ui/Common';
import { formatCurrency } from '../lib/utils';
import { LedgerEntry } from '../types';

export const SalesHistory = () => {
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    try {
      const res = await fetch('/api/ledger');
      const data = await res.json();
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const filteredHistory = history.filter(entry => 
    entry.date.includes(searchTerm)
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-headline">Daily Sales History</h2>
          <p className="text-slate-400 dark:text-slate-500 font-medium text-xs">Review past sales performance and expenses.</p>
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
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={14} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs focus:ring-1 focus:ring-primary/20 transition-all" 
              placeholder="Search by date (YYYY-MM-DD)..." 
              type="text"
            />
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
            <p className="text-slate-400 text-xs font-medium">Loading history...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <CalendarDays size={48} className="text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-slate-400 text-sm font-medium">No sales records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Cash Sales</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Online Sales</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Expenses</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <CalendarDays size={14} />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-headline">{entry.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-xs font-medium text-slate-600 dark:text-slate-400">
                      {formatCurrency(entry.cash_sales)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-xs font-medium text-slate-600 dark:text-slate-400">
                      {formatCurrency(entry.online_sales)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-xs font-medium text-error/80">
                      {formatCurrency(entry.total_expenses)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={cn(
                          "text-xs font-bold font-headline",
                          entry.net_balance >= 0 ? "text-emerald-600" : "text-error"
                        )}>
                          {formatCurrency(entry.net_balance)}
                        </span>
                        {entry.net_balance >= 0 ? (
                          <ArrowUpRight size={12} className="text-emerald-500" />
                        ) : (
                          <ArrowDownRight size={12} className="text-error" />
                        )}
                      </div>
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

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
