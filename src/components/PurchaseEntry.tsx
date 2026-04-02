import React, { useState, useEffect, useMemo } from 'react';
import { 
  ReceiptText, 
  ArrowLeft, 
  Truck, 
  Verified, 
  Printer, 
  ChevronDown,
  Trash2,
  Edit3,
  Calendar as CalendarIcon,
  IndianRupee,
  Plus
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Card, Button } from './ui/Common';
import { ConfirmModal } from './ui/Modal';
import { formatCurrency, formatDisplayDate, cn } from '../lib/utils';
import { Supplier, PurchaseInvoice } from '../types';

export const PurchaseEntry = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    invoice_number: '',
    running_number: '',
    date: new Date(),
    taxable_amount: 0,
    transport_charge: 0,
    gst_percent: 2.5,
  });

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id.toString() === formData.supplier_id);
  }, [suppliers, formData.supplier_id]);

  const normalizePurchase = (purchase: any): PurchaseInvoice => ({
    ...purchase,
    supplier_id: Number(purchase.supplier_id) || 0,
    taxable_amount: Number(purchase.taxable_amount) || 0,
    gst_percent: Number(purchase.gst_percent) || 2.5,
    cgst_amount: Number(purchase.cgst_amount) || 0,
    sgst_amount: Number(purchase.sgst_amount) || 0,
    tax_amount: Number(purchase.tax_amount) || 0,
    transport_charge: Number(purchase.transport_charge) || 0,
    gross_total: Number(purchase.gross_total) || 0,
    grand_total: Number(purchase.grand_total) || 0,
  });

  const invoiceParts = useMemo(() => {
    if (!selectedSupplier?.invoice_format || !selectedSupplier.invoice_format.includes('{{n}}')) {
      return null;
    }
    const [prefix, suffix] = selectedSupplier.invoice_format.split('{{n}}');
    return { prefix, suffix };
  }, [selectedSupplier]);

  useEffect(() => {
    if (invoiceParts) {
      const fullInvoice = `${invoiceParts.prefix}${formData.running_number}${invoiceParts.suffix}`;
      setFormData(prev => ({ ...prev, invoice_number: fullInvoice }));
    }
  }, [formData.running_number, invoiceParts]);

  const fetchPurchases = () => fetch('/api/purchases')
    .then(res => res.json())
    .then((data) => setPurchases(data.map(normalizePurchase)));
  const fetchSuppliers = () => fetch('/api/suppliers').then(res => res.json()).then(setSuppliers);

  useEffect(() => {
    fetchSuppliers();
    fetchPurchases();
  }, []);

  // Auto-calculation logic
  const calculations = useMemo(() => {
    const amount = Number(formData.taxable_amount) || 0;
    const transport = Number(formData.transport_charge) || 0;
    const rate = Number(formData.gst_percent) || 2.5;
    const cgst = amount * (rate / 100);
    const sgst = amount * (rate / 100);
    const taxTotal = sgst + cgst;
    const grossTotal = amount + taxTotal;
    const grandTotal = grossTotal + transport;

    return { sgst, cgst, taxTotal, grossTotal, grandTotal, rate };
  }, [formData.taxable_amount, formData.transport_charge, formData.gst_percent]);

  const handleSubmit = async () => {
    if (!formData.supplier_id || !formData.invoice_number || !formData.taxable_amount) {
      alert('Please fill all required fields');
      return;
    }

    const url = isEditing ? `/api/purchases/${isEditing}` : '/api/purchases';
    const method = isEditing ? 'PUT' : 'POST';

    const payload = {
      supplier_id: parseInt(formData.supplier_id),
      invoice_number: formData.invoice_number,
      date: formData.date.toISOString().split('T')[0],
      taxable_amount: formData.taxable_amount,
      gst_percent: formData.gst_percent,
      cgst_amount: calculations.cgst,
      sgst_amount: calculations.sgst,
      gross_total: calculations.grossTotal,
      transport_charge: formData.transport_charge,
      grand_total: calculations.grandTotal
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      resetForm();
      fetchPurchases();
      fetchSuppliers();
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      invoice_number: '',
      running_number: '',
      date: new Date(),
      taxable_amount: 0,
      transport_charge: 0,
      gst_percent: 2.5,
    });
    setIsEditing(null);
  };

  const handleEdit = (p: PurchaseInvoice) => {
    const supplier = suppliers.find(s => s.id === p.supplier_id);
    let runningNum = '';
    
    if (supplier?.invoice_format && supplier.invoice_format.includes('{{n}}')) {
      const [prefix, suffix] = supplier.invoice_format.split('{{n}}');
      runningNum = p.invoice_number.replace(prefix, '').replace(suffix, '');
    }

    setFormData({
      supplier_id: p.supplier_id.toString(),
      invoice_number: p.invoice_number,
      running_number: runningNum,
      date: new Date(p.date),
      taxable_amount: Number(p.taxable_amount) || 0,
      transport_charge: Number(p.transport_charge) || 0,
      gst_percent: Number(p.gst_percent) || 2.5,
    });
    setIsEditing(p.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/purchases/${deleteId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchPurchases();
      fetchSuppliers();
    }
    setDeleteId(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <ArrowLeft size={12} strokeWidth={3} />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] font-label">Accounting Workflow</span>
          </div>
          <h1 className="text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight">
            {isEditing ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}
          </h1>
          <p className="text-slate-400 dark:text-slate-300 font-medium mt-1 text-xs">Standardized entry for supplier invoices with automated GST calculation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Printer} className="text-[10px] px-3 py-1.5">Print Draft</Button>
          <Button onClick={handleSubmit} icon={Verified} className="text-[10px] px-3 py-1.5">{isEditing ? 'Update Invoice' : 'Post Invoice'}</Button>
        </div>
      </header>

      <Card className="p-0 border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
        {/* Header Section */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Supplier</label>
              <div className="relative">
                <select 
                  tabIndex={1}
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                  className="w-full bg-transparent border-none py-1 px-0 focus:ring-0 border-b border-slate-200 dark:border-slate-700 focus:border-primary transition-all font-bold text-sm text-slate-900 dark:text-slate-100 cursor-pointer appearance-none"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 dark:text-slate-600" size={14} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Invoice Number</label>
              {invoiceParts ? (
                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 py-1">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{invoiceParts.prefix}</span>
                  <input 
                    tabIndex={2}
                    value={formData.running_number}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                      setFormData({...formData, running_number: val});
                    }}
                    className="flex-1 bg-transparent border-none p-0 focus:ring-0 font-bold text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-800 min-w-[40px]" 
                    placeholder="Num" 
                    type="text"
                  />
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{invoiceParts.suffix}</span>
                </div>
              ) : (
                <input 
                  tabIndex={2}
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                  className="w-full bg-transparent border-none py-1 px-0 focus:ring-0 border-b border-slate-200 dark:border-slate-700 focus:border-primary transition-all font-bold text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-800" 
                  placeholder="Enter Invoice #" 
                  type="text"
                />
              )}
              {invoiceParts && (
                <div className="text-[8px] font-bold text-primary/40 uppercase tracking-tight mt-1">
                  Preview: {formData.invoice_number || '...'}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Invoice Date</label>
              <div className="relative custom-datepicker">
                <DatePicker
                  tabIndex={3}
                  selected={formData.date}
                  onChange={(date: Date) => setFormData({...formData, date: date || new Date()})}
                  className="w-full bg-transparent border-none py-1 px-0 focus:ring-0 border-b border-slate-200 dark:border-slate-700 focus:border-primary transition-all font-bold text-sm text-slate-900 dark:text-slate-100"
                  dateFormat="dd/MM/yyyy"
                />
                <CalendarIcon className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 dark:text-slate-600" size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Items/Financials Section */}
        <div className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-3 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Description</th>
                <th className="px-6 py-3 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right w-48">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              <tr>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <ReceiptText size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Taxable Goods/Services</p>
                      <p className="text-[10px] text-slate-400 font-medium">Base amount before taxes</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <input 
                    tabIndex={4}
                    value={formData.taxable_amount || ''}
                    onChange={(e) => setFormData({...formData, taxable_amount: parseFloat(e.target.value) || 0})}
                    className="w-full bg-transparent border-none text-right focus:ring-0 font-bold text-sm text-slate-900 dark:text-slate-100 tabular-nums" 
                    placeholder="0.00" 
                    type="number"
                  />
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <ReceiptText size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">GST Rate</p>
                      <p className="text-[10px] text-slate-400 font-medium">Adjust CGST/SGST percentage per invoice</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <input
                      tabIndex={5}
                      value={formData.gst_percent}
                      onChange={(e) => setFormData({...formData, gst_percent: parseFloat(e.target.value) || 2.5})}
                      className="w-24 bg-transparent border-none text-right focus:ring-0 font-bold text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                      placeholder="2.5"
                      type="number"
                      step="0.1"
                      min="0"
                    />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">%</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Truck size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Transportation Charge</p>
                      <p className="text-[10px] text-slate-400 font-medium">Freight and delivery costs</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <input 
                    tabIndex={6}
                    value={formData.transport_charge || ''}
                    onChange={(e) => setFormData({...formData, transport_charge: parseFloat(e.target.value) || 0})}
                    className="w-full bg-transparent border-none text-right focus:ring-0 font-bold text-sm text-slate-900 dark:text-slate-100 tabular-nums" 
                    placeholder="0.00" 
                    type="number"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Footer Section */}
        <div className="p-8 bg-slate-50/30 dark:bg-slate-900/30 flex justify-end">
          <div className="w-full max-w-xs space-y-3">
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>Taxable Subtotal</span>
              <span className="tabular-nums font-bold text-slate-700 dark:text-slate-300">{formatCurrency(formData.taxable_amount)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5">
                CGST <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-1 rounded">{calculations.rate}%</span>
              </span>
              <span className="tabular-nums">{formatCurrency(calculations.cgst)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5">
                SGST <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-1 rounded">{calculations.rate}%</span>
              </span>
              <span className="tabular-nums">{formatCurrency(calculations.sgst)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Gross Total</span>
              <span className="tabular-nums font-bold text-slate-700 dark:text-slate-300">{formatCurrency(calculations.grossTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>Transport</span>
              <span className="tabular-nums font-bold text-slate-700 dark:text-slate-300">{formatCurrency(formData.transport_charge)}</span>
            </div>
            <div className="pt-4 border-t-2 border-primary/20 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Grand Total</span>
              <span className="text-3xl font-black font-headline text-primary tabular-nums tracking-tighter">
                {formatCurrency(calculations.grandTotal)}
              </span>
            </div>
            <div className="pt-6">
              <Button 
                tabIndex={7}
                onClick={handleSubmit} 
                className="w-full py-3 text-xs shadow-xl shadow-primary/20" 
                icon={Verified}
              >
                {isEditing ? 'Update Ledger' : 'Post to Ledger'}
              </Button>
              {isEditing && (
                <button 
                  onClick={resetForm}
                  className="w-full mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Discard Changes
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Entries Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold font-headline text-lg tracking-tight text-slate-900 dark:text-slate-100">Recent Transactions</h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Plus size={12} />
            <span>Last 10 Entries</span>
          </div>
        </div>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-3 font-label text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-300 font-bold">Invoice #</th>
                  <th className="px-6 py-3 font-label text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-300 font-bold">Supplier</th>
                  <th className="px-6 py-3 font-label text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-300 font-bold">Date</th>
                  <th className="px-6 py-3 font-label text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-300 font-bold text-right">Amount</th>
                  <th className="px-6 py-3 font-label text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-300 dark:text-slate-300 text-xs italic font-medium">No entries recorded yet</td>
                  </tr>
                ) : (
                  purchases.slice(0, 10).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                      <td className="px-6 py-3 text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">{p.invoice_number}</td>
                      <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-400 font-bold">{p.supplier_name}</td>
                      <td className="px-6 py-3 text-xs text-slate-400 dark:text-slate-300 font-medium">{formatDisplayDate(p.date)}</td>
                      <td className="px-6 py-3 text-xs font-bold tabular-nums text-right text-primary">{formatCurrency(p.grand_total)}</td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button 
                            onClick={() => handleEdit(p)}
                            className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => setDeleteId(p.id)}
                            className="p-1.5 text-slate-300 hover:text-error hover:bg-error/10 rounded-md transition-all"
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
      </div>

      <ConfirmModal 
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action will also revert the supplier's outstanding balance."
      />
    </div>
  );
};
