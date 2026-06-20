import React from 'react';

const ComparisonTable = ({ results, activePrompt, promptType }) => {
  const sortedResults = [...(results || [])].sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return a.latency - b.latency;
  });

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700">
        <h3 className="font-semibold text-sm">Prompt Comparison</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Prompt: {activePrompt || 'Run a prompt to compare all models.'}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">
          Strategy: {promptType || 'zero-shot'}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider">
              <th className="px-4 py-3 font-semibold">Model</th>
              <th className="px-4 py-3 font-semibold text-right">Latency</th>
              <th className="px-4 py-3 font-semibold text-right">Energy</th>
              <th className="px-4 py-3 font-semibold text-right">Accuracy</th>
              <th className="px-4 py-3 font-semibold text-right">Power</th>
              <th className="px-4 py-3 font-semibold text-right">Tokens</th>
              <th className="px-4 py-3 font-semibold">Answer Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {sortedResults.length > 0 ? sortedResults.map((result) => (
              <tr key={`${result.run_id}-${result.model_id}`} className="align-top hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                <td className="px-4 py-4 font-medium">
                  <div>{result.model_id}</div>
                </td>
                <td className="px-4 py-4 text-right font-semibold">{result.latency}s</td>
                <td className="px-4 py-4 text-right font-semibold">{result.energy} Wh</td>
                <td className="px-4 py-4 text-right font-semibold">{result.accuracy}%</td>
                <td className="px-4 py-4 text-right font-semibold">{result.power} W</td>
                <td className="px-4 py-4 text-right font-semibold">{result.tokens}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300 max-w-[480px]">
                  {result.answer}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-slate-400 italic">
                  Use Compare All to build a clear model-by-model comparison for one prompt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ComparisonTable;
