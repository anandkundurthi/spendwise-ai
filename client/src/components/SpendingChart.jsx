import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis
} from 'recharts';

export default function SpendingChart({ chartData, money }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#648a70" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#648a70" stopOpacity={0.01} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 5"
          vertical={false}
          stroke="#ecebe4"
        />

        <XAxis
          dataKey="day"
          interval="preserveStartEnd"
          minTickGap={18}
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#99998f', fontSize: 11 }}
        />

        <Tooltip
          formatter={(value) => [money(value), 'Expenses']}
          labelFormatter={(_, payload) => {
            const date = payload?.[0]?.payload?.date;

            return date
              ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'UTC'
                })
              : '';
          }}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #e9e8df',
            fontFamily: 'DM Sans'
          }}
        />

        <Area
          type="monotone"
          dataKey="amount"
          stroke="#50785d"
          strokeWidth={2.5}
          fill="url(#spendFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
