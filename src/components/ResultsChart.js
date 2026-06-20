import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ResultsChart = ({ results }) => {
  const data = (results || []).map((item) => ({
    name: item.model_id.split('/').pop(),
    energy: parseFloat((item.energy || 0).toFixed(2)),
    latency: parseFloat((item.latency || 0).toFixed(2))
  }));

  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col h-full">
      <h3 className="font-semibold text-sm mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400 text-lg">analytics</span>
        Latest Prompt Model Comparison
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10 }} 
            />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
              itemStyle={{ fontSize: '11px' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle" 
              formatter={(value) => <span className="text-slate-500 text-[10px] ml-1">{value === 'energy' ? 'Energy (Wh)' : 'Latency (s)'}</span>}
            />
            <Bar dataKey="energy" fill="#10b981" radius={[2, 2, 0, 0]} barSize={15} name="energy" />
            <Bar dataKey="latency" fill="#60a5fa" radius={[2, 2, 0, 0]} barSize={15} name="latency" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default ResultsChart;
