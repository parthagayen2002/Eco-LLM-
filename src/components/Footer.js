import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6 lg:p-4 text-center">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 opacity-80">
          <span className="material-symbols-outlined text-emerald-500 text-lg">eco</span>
          <span className="font-bold text-sm tracking-tight">EcoLLM Framework</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg lg:max-w-none">
          © 2024 EcoLLM Framework. Building more sustainable intelligence for a greener future.
        </p>
        <div className="flex justify-center gap-6">
          <a className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline transition-colors" href="#">Privacy Policy</a>
          <a className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline transition-colors" href="#">Terms of Service</a>
          <a className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline transition-colors" href="#">Support</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
