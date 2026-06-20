import React from 'react';

const Navbar = ({ theme, toggleTheme, activeView, onViewChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'history', label: 'History' },
    { id: 'analytics', label: 'Analytics' }
  ];

  return (
    <header className="bg-emerald-700 dark:bg-emerald-900 text-white p-4 sticky top-0 z-50 shadow-lg">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-300 text-3xl">eco</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">EcoLLM</h1>
            <p className="text-[10px] text-emerald-100/70 uppercase tracking-widest font-medium">Energy-Aware Evaluation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 text-sm font-medium mr-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={`transition-colors ${
                  activeView === item.id
                    ? 'text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button 
            id="themeToggle" 
            onClick={toggleTheme}
            className="p-2 hover:bg-emerald-600/50 rounded-lg transition-colors" 
            title="Toggle theme"
          >
            <span className="material-symbols-outlined">
              {theme === 'dark' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>
          <button className="p-2 hover:bg-emerald-600/50 rounded-lg lg:hidden">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
