import React from 'react';

const RankingTable = ({ history, onClearHistory }) => {
  const rankings = [...(history || [])]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Recent Measurements</h3>
        <button
          type="button"
          className="text-xs text-primary font-medium hover:underline"
          onClick={onClearHistory}
        >
          Clear All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider">
              <th className="px-6 py-4 font-semibold">Model</th>
              <th className="px-6 py-4 font-semibold">Strategy</th>
              <th className="px-6 py-4 font-semibold text-right">Accuracy</th>
              <th className="px-6 py-4 font-semibold text-right">Power</th>
              <th className="px-6 py-4 font-semibold text-right">Latency</th>
              <th className="px-6 py-4 font-semibold text-right">Energy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {rankings.length > 0 ? rankings.map((r, idx) => (
              <tr key={`${r.timestamp}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 font-medium max-w-[240px] truncate">
                  {r.model_id.split('/').pop()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    r.prompt_type === 'cot' ? 'bg-amber-100 text-amber-600' : 
                    r.prompt_type === 'few-shot' ? 'bg-blue-100 text-blue-600' : 
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {r.prompt_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                  {r.accuracy || 0}%
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                  {r.power || 0} W
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                  {r.latency}s
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                  {r.energy} Wh
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-slate-400 italic">
                  No medical history yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RankingTable;
