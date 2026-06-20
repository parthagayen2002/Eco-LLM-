import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const EnergyScatter = ({ history }) => {
  const colors = {
    'microsoft/phi-2': '#10b981',
    'google/gemma-2b': '#3b82f6',
    'Qwen/Qwen2.5-0.5B-Instruct': '#8b5cf6',
    'TinyLlama/TinyLlama-1.1B-Chat-v1.0': '#f59e0b'
  };

  const data = (history || []).map((item, idx) => ({
    x: item.energy,
    y: item.latency,
    name: `${item.model_id.split('/').pop()} - ${item.prompt.substring(0, 24)}${item.prompt.length > 24 ? '...' : ''}`,
    model: item.model_id,
    type: item.prompt_type,
    color: colors[item.model_id] || '#64748b'
  }));

  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col h-full">
      <h3 className="font-semibold text-sm mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400 text-lg">scatter_plot</span>
        Latency vs Energy By Prompt and Model
      </h3>
      <div className="relative flex-grow min-h-[256px] w-full bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-[80%] h-[60%] bg-blue-500 blur-[80px] rounded-full"></div>
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
            <XAxis type="number" dataKey="x" name="Energy" unit="Wh" hide />
            <YAxis type="number" dataKey="y" name="Latency" unit="s" hide />
            <ZAxis type="number" range={[60, 60]} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '10px' }}
            />
            <Scatter data={data} fill="#8884d8">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <div className="absolute top-4 right-4 flex flex-col gap-1">
          {Object.entries(colors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-[8px] uppercase font-bold tracking-tighter">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-slate-500">{type.split('/').pop()}</span>
            </div>
          ))}
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-slate-400 font-medium pointer-events-none uppercase tracking-widest">
          Energy Consumption (Wh)
        </div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-slate-400 font-medium pointer-events-none uppercase tracking-widest">
          Latency (Seconds)
        </div>
      </div>
    </section>
  );
};

export default EnergyScatter;
