import React from 'react';

const SessionSummary = ({ history }) => {
  const totalConsultations = history ? history.length : 0;
  const avgLatency = totalConsultations > 0 
    ? (history.reduce((acc, curr) => acc + curr.latency, 0) / totalConsultations).toFixed(2)
    : 0;
  
  const fastestResult = totalConsultations > 0
    ? [...history].sort((a, b) => a.latency - b.latency)[0]
    : null;

  const lowestEnergyResult = totalConsultations > 0
    ? [...history].sort((a, b) => a.energy - b.energy)[0]
    : null;
  const highestAccuracyResult = totalConsultations > 0
    ? [...history].sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))[0]
    : null;

  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
      <h3 className="font-semibold text-sm mb-4">Model Comparison Summary</h3>
      <div className="space-y-1">
        <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">history</span>
            <span className="text-sm text-slate-500">Total Measurements</span>
          </div>
          <span className="text-sm font-semibold">{totalConsultations}</span>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">timer</span>
            <span className="text-sm text-slate-500">Fastest Model</span>
          </div>
          <span className="text-sm font-semibold">{fastestResult ? fastestResult.model_id.split('/').pop() : 'None'}</span>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">eco</span>
            <span className="text-sm text-slate-500">Lowest Energy Model</span>
          </div>
          <span className="text-sm font-semibold">{lowestEnergyResult ? lowestEnergyResult.model_id.split('/').pop() : 'None'}</span>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">verified</span>
            <span className="text-sm text-slate-500">Highest Accuracy Model</span>
          </div>
          <span className="text-sm font-semibold">{highestAccuracyResult ? highestAccuracyResult.model_id.split('/').pop() : 'None'}</span>
        </div>
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">speed</span>
            <span className="text-sm text-slate-500">Avg. Response Time</span>
          </div>
          <span className="text-sm font-semibold">{avgLatency}s</span>
        </div>
      </div>
    </section>
  );
};

export default SessionSummary;
