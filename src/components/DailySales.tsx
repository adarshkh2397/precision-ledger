import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  CalendarDays, 
  Verified, 
  FileText, 
  PlusCircle, 
  X, 
  History as HistoryIcon,
  Trash2,
  Calendar as CalendarIcon
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Card, Button } from './ui/Common';
import { ConfirmModal } from './ui/Modal';
import { formatCurrency } from '../lib/utils';
import { LedgerEntry } from '../types';

export const DailySales = () => {
  const [formData, setFormData] = useState({
    date: new Date(),
    cash_sales: 0,
    online_sales: 0,
    expenses: [] as { description: string, amount: number }[]
  });
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchLedger = () => fetch('/api/ledger').then(res => res.json()).then(setHistory);
  useEffect(() => { fetchLedger(); }, []);

  const totalExpenses = formData.expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const dailyTotal = formData.cash_sales + formData.online_sales;
  const netBalance = dailyTotal - totalExpenses;

  const addExpense = () => {
    setFormData({ ...formData, expenses: [...formData.expenses, { description: '', amount: 0 }] });
  };

  const updateExpense = (index: number, field: 'description' | 'amount', value: any) => {
    const newExpenses = [...formData.expenses];
    newExpenses[index] = { ...newExpenses[index], [field]: value };
    setFormData({ ...formData, expenses: newExpenses });
  };

  const removeExpense = (index: number) => {
    setFormData({ ...formData, expenses: formData.expenses.filter((_, i) => i !== index) });
  };

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      date: formData.date.toISOString().split('T')[0]
    };

    const res = await fetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      fetchLedger();
      setFormData({
        date: new Date(),
        cash_sales: 0,
        online_sales: 0,
        expenses: []
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/ledger/${deleteId}`, { method: 'DELETE' });
    if (res.ok) fetchLedger();
    setDeleteId(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-headline">Daily Sales Log</h2>
          <p className="text-slate-400 dark:text-slate-500 font-medium text-xs">Record and reconcile your end-of-day revenue in INR.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 space-y-6">
          <Card className="p-6">
            <div className="p-0 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                    <CalendarDays size={20} />
                  </div>
                  <div className="custom-datepicker">
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-0.5">Logging For</label>
                    <div className="relative">
                      <DatePicker
                        selected={formData.date}
                        onChange={(date: Date) => setFormData({...formData, date: date || new Date()})}
                        className="border-none p-0 text-lg font-bold text-slate-900 dark:text-slate-100 focus:ring-0 bg-transparent font-headline w-32"
                        dateFormat="dd/MM/yyyy"
                      />
                      <CalendarIcon className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 dark:text-slate-600" size={14} />
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 ring-1 ring-emerald-100/50 dark:ring-emerald-900/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  System Open
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                    <IndianRupee size={10} className="text-primary" strokeWidth={3} />
                    Cash Sales
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-300 dark:text-slate-700">₹</span>
                    <input 
                      value={formData.cash_sales || ''}
                      onChange={(e) => setFormData({...formData, cash_sales: parseFloat(e.target.value) || 0})}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-primary/10 transition-all text-xl font-bold rounded-xl text-slate-900 dark:text-slate-100 tabular-nums" 
                      placeholder="0.00" 
                      type="number"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                    <Verified size={10} className="text-primary" strokeWidth={3} />
                    Digital Sales
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-300 dark:text-slate-700">₹</span>
                    <input 
                      value={formData.online_sales || ''}
                      onChange={(e) => setFormData({...formData, online_sales: parseFloat(e.target.value) || 0})}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-primary/10 transition-all text-xl font-bold rounded-xl text-slate-900 dark:text-slate-100 tabular-nums" 
                      placeholder="0.00" 
                      type="number"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <FileText size={18} className="text-slate-300 dark:text-slate-700" />
                    Daily Expenses
                  </h3>
                  <Button onClick={addExpense} variant="ghost" className="text-[9px] uppercase tracking-widest px-2 py-1" icon={PlusCircle}>Add Row</Button>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/30">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Expense Item</th>
                        <th className="px-4 py-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Amount (₹)</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {formData.expenses.map((exp, i) => (
                        <tr key={i} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                          <td className="px-4 py-2">
                            <input 
                              value={exp.description}
                              onChange={(e) => updateExpense(i, 'description', e.target.value)}
                              className="w-full text-xs border-none bg-transparent focus:ring-0 p-0 placeholder:text-slate-200 dark:placeholder:text-slate-700 font-semibold text-slate-700 dark:text-slate-300" 
                              placeholder="e.g., Tea/Coffee" 
                              type="text"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input 
                              value={exp.amount || ''}
                              onChange={(e) => updateExpense(i, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-20 text-xs border-none bg-transparent focus:ring-0 p-0 text-right placeholder:text-slate-200 dark:placeholder:text-slate-700 font-bold text-slate-900 dark:text-slate-100 tabular-nums" 
                              placeholder="0" 
                              type="number"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => removeExpense(i)} className="text-slate-200 dark:text-slate-700 hover:text-error transition-colors">
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-white/50 dark:bg-slate-800/50">
                        <td className="px-4 py-3 font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Daily Expenses</td>
                        <td className="px-4 py-3 text-right font-bold text-base text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(totalExpenses)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-primary text-on-primary p-6 rounded-2xl shadow-xl shadow-primary/10 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.2em]">Net Daily Balance</p>
                    <p className="text-4xl font-bold tracking-tighter font-headline">{formatCurrency(netBalance)}</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full py-3 text-base" icon={Verified}>
                Confirm & Save Entry
              </Button>
            </div>
          </Card>
        </section>

        <section className="lg:col-span-5 space-y-6">
          <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight px-1">Recent History</h3>
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-center text-slate-300 dark:text-slate-700 text-xs italic py-8">No history recorded yet</p>
            ) : (
              history.map(entry => (
                <div key={entry.id}>
                  <Card className="p-4 group hover:scale-[1.01] transition-transform duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-700 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <HistoryIcon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight font-headline">{entry.date}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Net: {formatCurrency(entry.net_balance)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(entry.cash_sales + entry.online_sales)}</p>
                        </div>
                        <button 
                          onClick={() => setDeleteId(entry.id)}
                          className="p-1.5 text-slate-200 dark:text-slate-700 hover:text-error hover:bg-error/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </Card>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <ConfirmModal 
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Ledger Entry"
        message="Are you sure you want to delete this daily sales entry? This action cannot be undone."
      />
    </div>
  );
};
