import React from 'react';

const MetricsCards = ({ metrics }) => {
  const displayMetrics = [
    { label: 'Accuracy', value: `${metrics.accuracy}%`, icon: 'check_circle', color: 'text-primary' },
    { label: 'Power', value: `${metrics.power}w`, icon: 'bolt', color: 'text-yellow-500' },
    { label: 'Energy', value: metrics.energy, unit: 'Wh', icon: 'eco', color: 'text-primary' },
    { label: 'Response', value: metrics.latency, unit: 's', icon: 'timer', color: 'text-blue-400' },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {displayMetrics.map((m, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{m.label}</span>
            <span className={`material-symbols-outlined ${m.color} text-base`}>{m.icon}</span>
          </div>
          <div className="text-3xl font-bold">
            {m.value}
            {m.unit && <span className="text-base font-normal ml-1">{m.unit}</span>}
          </div>
        </div>
      ))}
    </section>
  );
};

export default MetricsCards;
