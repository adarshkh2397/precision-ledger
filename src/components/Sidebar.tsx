import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  IndianRupee, 
  Users, 
  History as HistoryIcon, 
  PlusCircle,
  Moon,
  Sun,
  ClipboardList,
  ShoppingCart
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Page } from '../types';
import { Button } from './ui/Common';

interface SidebarProps {
  currentPage: Page;
  setPage: (p: Page) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const Sidebar = ({ currentPage, setPage, darkMode, toggleDarkMode }: SidebarProps) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'purchases', label: 'Purchase Entry', icon: ShoppingCart },
    { id: 'purchase-history', label: 'Purchase History', icon: ReceiptText },
    { id: 'sales', label: 'Daily Sales', icon: IndianRupee },
    { id: 'sales-history', label: 'Sales History', icon: ClipboardList },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
  ];

  return (
    <aside className="h-screen w-56 fixed left-0 top-0 bg-white dark:bg-slate-950 flex flex-col border-r border-slate-200 dark:border-slate-800 z-50 hidden md:flex transition-colors">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <IndianRupee size={18} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-headline leading-tight tracking-tight">Precision Ledger</h1>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Retail Utility</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id as Page)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 transition-all duration-300 font-headline text-[11px] font-bold tracking-tight rounded-lg",
                currentPage === item.id 
                  ? "bg-primary text-white shadow-md shadow-primary/10" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-primary"
              )}
            >
              <item.icon size={16} strokeWidth={currentPage === item.id ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-5 space-y-3">
        <button 
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold text-[10px] uppercase tracking-widest"
        >
          <span className="flex items-center gap-2">
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
        <Button 
          onClick={() => setPage('purchases')}
          className="w-full py-2 text-[10px]"
          icon={PlusCircle}
        >
          Quick Entry
        </Button>
      </div>
    </aside>
  );
};
