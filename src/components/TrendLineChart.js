import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const TrendLineChart = ({ results }) => {
  const data = [...(results || [])]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((item, index) => ({
      name: `${item.model_id.split('/').pop()} ${index + 1}`,
      latency: parseFloat((item.latency || 0).toFixed(2)),
      accuracy: item.accuracy || 0
    }));

  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col h-full">
      <h3 className="font-semibold text-sm mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400 text-lg">show_chart</span>
        Performance Trend
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              domain={[60, 100]}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
              itemStyle={{ fontSize: '11px' }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-slate-500 text-[10px] ml-1">
                  {value === 'latency' ? 'Latency (s)' : 'Accuracy (%)'}
                </span>
              )}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="latency"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="latency"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="accuracy"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="accuracy"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default TrendLineChart;
