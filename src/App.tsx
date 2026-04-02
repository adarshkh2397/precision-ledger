import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PurchaseEntry } from './components/PurchaseEntry';
import { DailySales } from './components/DailySales';
import { Suppliers } from './components/Suppliers';
import { Page } from './types';
import { PurchaseHistory } from './components/PurchaseHistory';
import { SalesHistory } from './components/SalesHistory';
import { Search, Bell } from 'lucide-react';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body selection:bg-primary/10 selection:text-primary transition-colors duration-300">
      <Sidebar 
        currentPage={page} 
        setPage={setPage} 
        darkMode={darkMode} 
        toggleDarkMode={toggleDarkMode} 
      />
      <main className="md:ml-56 min-h-screen flex flex-col">
        {/* Global Search Bar replacing TopBar */}
        <header className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-all duration-200 ease-in-out">
          <div className="flex justify-between items-center w-full px-6 py-2.5 max-w-full">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={12} />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-4 py-1.5 bg-slate-100 dark:bg-slate-900 border-none rounded-full text-[10px] focus:ring-1 focus:ring-primary/10 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                  placeholder="Global Search (Invoices, Suppliers, Sales)..." 
                  type="text"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative">
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-error rounded-full border-2 border-white dark:border-slate-950"></span>
              </button>
              <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden ml-1 ring-1 ring-white dark:ring-slate-950 shadow-sm border border-slate-200 dark:border-slate-800">
                <img 
                  alt="User profile" 
                  src="https://picsum.photos/seed/user/100/100"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            {page === 'dashboard' && <Dashboard />}
            {page === 'purchases' && <PurchaseEntry />}
            {page === 'purchase-history' && <PurchaseHistory />}
            {page === 'sales' && <DailySales />}
            {page === 'sales-history' && <SalesHistory />}
            {page === 'suppliers' && <Suppliers />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
