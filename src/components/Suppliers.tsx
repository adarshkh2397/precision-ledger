import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  PlusCircle, 
  X, 
  Trash2, 
  Edit3 
} from 'lucide-react';
import { Card, Button } from './ui/Common';
import { Modal, ConfirmModal } from './ui/Modal';
import { formatCurrency, cn } from '../lib/utils';
import { Supplier } from '../types';

export const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', phone: '', gst_number: '', invoice_format: '' });
  const [showPayment, setShowPayment] = useState<Supplier | null>(null);
  const [paymentData, setPaymentData] = useState({ amount: 0, method: 'Cash' as 'Cash' | 'Cheque', date: new Date().toISOString().split('T')[0] });

  const fetchSuppliers = () => fetch('/api/suppliers').then(res => res.json()).then(setSuppliers);
  useEffect(() => { fetchSuppliers(); }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.gst_number.toLowerCase().includes(search.toLowerCase()) ||
      s.contact.toLowerCase().includes(search.toLowerCase())
    );
  }, [suppliers, search]);

  const handleAddSupplier = async () => {
    if (!newSupplier.name) return;
    await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSupplier)
    });
    setShowAdd(false);
    setNewSupplier({ name: '', contact: '', phone: '', gst_number: '', invoice_format: '' });
    fetchSuppliers();
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier || !editingSupplier.name) return;
    await fetch(`/api/suppliers/${editingSupplier.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingSupplier)
    });
    setEditingSupplier(null);
    fetchSuppliers();
  };

  const handleDeleteSupplier = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/suppliers/${deleteId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to delete supplier');
    } else {
      fetchSuppliers();
    }
    setDeleteId(null);
  };

  const handlePayment = async () => {
    if (!showPayment || !paymentData.amount) return;
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplier_id: showPayment.id, ...paymentData })
    });
    setShowPayment(null);
    setPaymentData({ amount: 0, method: 'Cash', date: new Date().toISOString().split('T')[0] });
    fetchSuppliers();
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight">Supplier Portfolio</h1>
          <p className="text-slate-400 dark:text-slate-500 font-medium mt-1 text-xs">Manage vendor relationships and track outstanding payables in INR.</p>
        </div>
        <Card className="px-6 py-4 bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 flex flex-col items-end">
          <span className="text-[9px] uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600 font-bold mb-0.5">Total Outstanding</span>
          <span className="text-xl font-bold font-headline tabular-nums text-primary">
            {formatCurrency(suppliers.reduce((acc, s) => acc + s.current_balance, 0))}
          </span>
        </Card>
      </header>

      <Card className="p-0">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center bg-slate-50/30 dark:bg-slate-900/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={14} />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs w-72 focus:ring-1 focus:ring-primary/10 focus:border-primary transition-all font-semibold placeholder:text-slate-200 dark:placeholder:text-slate-700 text-slate-900 dark:text-slate-100" 
              placeholder="Search by name, GST, or contact..." 
              type="text"
            />
          </div>
          <Button onClick={() => setShowAdd(true)} icon={PlusCircle} className="text-[10px] px-3 py-1.5">Add Supplier</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-3 text-[9px] uppercase tracking-[0.15em] font-bold text-slate-400 dark:text-slate-500">Supplier Details</th>
                <th className="px-6 py-3 text-[9px] uppercase tracking-[0.15em] font-bold text-slate-400 dark:text-slate-500">Contact</th>
                <th className="px-6 py-3 text-[9px] uppercase tracking-[0.15em] font-bold text-slate-400 dark:text-slate-500 text-right">Outstanding</th>
                <th className="px-6 py-3 text-[9px] uppercase tracking-[0.15em] font-bold text-slate-400 dark:text-slate-500 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-300 dark:text-slate-700 text-xs italic font-medium">No suppliers found</td>
                </tr>
              ) : (
                filteredSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/10">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm font-headline">{s.name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 tracking-tight">{s.gst_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 font-bold">
                      <div>{s.contact}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{s.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-bold text-primary text-base">{formatCurrency(s.current_balance)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1">
                        <Button onClick={() => setShowPayment(s)} className="px-3 py-1 text-[8px] uppercase tracking-widest">Pay</Button>
                        <button 
                          onClick={() => setEditingSupplier(s)}
                          className="p-1.5 text-slate-300 dark:text-slate-700 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(s.id)}
                          className="p-1.5 text-slate-300 dark:text-slate-700 hover:text-error hover:bg-error/10 rounded-md transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier">
        <div className="space-y-4">
          {['name', 'contact', 'phone', 'gst_number', 'invoice_format'].map(field => (
            <div key={field} className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{field.replace('_', ' ')}</label>
                {field === 'invoice_format' && (
                  <span className="text-[7px] text-primary/50 font-bold uppercase tracking-tight">Use {"{{n}}"} for running number</span>
                )}
              </div>
              <input 
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg font-semibold text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary/10 transition-all"
                value={(newSupplier as any)[field] || ''}
                onChange={(e) => setNewSupplier({...newSupplier, [field]: e.target.value})}
                placeholder={field === 'invoice_format' ? 'e.g. UH/25-26/{{n}}' : ''}
              />
            </div>
          ))}
          <Button onClick={handleAddSupplier} className="w-full py-2 text-xs">Save Supplier</Button>
        </div>
      </Modal>

      <Modal isOpen={editingSupplier !== null} onClose={() => setEditingSupplier(null)} title="Edit Supplier">
        <div className="space-y-4">
          {['name', 'contact', 'phone', 'gst_number', 'invoice_format'].map(field => (
            <div key={field} className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{field.replace('_', ' ')}</label>
                {field === 'invoice_format' && (
                  <span className="text-[7px] text-primary/50 font-bold uppercase tracking-tight">Use {"{{n}}"} for running number</span>
                )}
              </div>
              <input 
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg font-semibold text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary/10 transition-all"
                value={(editingSupplier as any)?.[field] || ''}
                onChange={(e) => setEditingSupplier({...editingSupplier!, [field]: e.target.value})}
                placeholder={field === 'invoice_format' ? 'e.g. UH/25-26/{{n}}' : ''}
              />
            </div>
          ))}
          <Button onClick={handleUpdateSupplier} className="w-full py-2 text-xs">Update Supplier</Button>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteSupplier}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action cannot be undone and will fail if the supplier has existing invoices."
      />

      <Modal isOpen={showPayment !== null} onClose={() => setShowPayment(null)} title="Record Payment">
        <div className="space-y-6">
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-[9px] font-bold text-primary/50 uppercase tracking-widest mb-1">Paying To</p>
            <p className="text-base font-bold font-headline text-primary">{showPayment?.name}</p>
            <p className="text-[10px] text-primary font-bold mt-1">Outstanding: {formatCurrency(showPayment?.current_balance || 0)}</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Amount Paid (INR)</label>
              <input 
                type="number" 
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-lg font-bold tabular-nums focus:ring-1 focus:ring-primary/10 transition-all text-slate-900 dark:text-slate-100"
                value={paymentData.amount || ''}
                onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {['Cash', 'Cheque'].map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentData({...paymentData, method: m as any})}
                    className={cn(
                      "py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      paymentData.method === m ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handlePayment} className="w-full py-2.5 text-xs">Confirm Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
