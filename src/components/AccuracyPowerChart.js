import React from 'react';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip, Scatter, Cell } from 'recharts';

const MODEL_COLORS = {
  'microsoft/phi-2': '#10b981',
  'google/gemma-2b': '#3b82f6',
  'Qwen/Qwen2.5-0.5B-Instruct': '#8b5cf6',
  'TinyLlama/TinyLlama-1.1B-Chat-v1.0': '#f59e0b'
};

const AccuracyPowerChart = ({ results }) => {
  const data = (results || []).map((item) => ({
    x: item.power || 0,
    y: item.accuracy || 0,
    z: 90,
    label: item.model_id.split('/').pop(),
    color: MODEL_COLORS[item.model_id] || '#64748b'
  }));

  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col h-full">
      <h3 className="font-semibold text-sm mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400 text-lg">monitoring</span>
        Accuracy vs Power
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
            <XAxis type="number" dataKey="x" name="Power" unit="W" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis type="number" dataKey="y" name="Accuracy" unit="%" tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[60, 100]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '10px' }}
              formatter={(value, name) => [name === 'Accuracy' ? `${value}%` : `${value} W`, name]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ''}
            />
            <Scatter data={data} name="Accuracy">
              {data.map((entry, index) => (
                <Cell key={`accuracy-power-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default AccuracyPowerChart;
