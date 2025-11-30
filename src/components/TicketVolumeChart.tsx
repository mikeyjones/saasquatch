import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface TicketVolumeChartProps {
  data: Array<{ day: string; chat: number; email: number }>
}

export function TicketVolumeChart({ data }: TicketVolumeChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={0}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          ticks={[0, 40, 80, 120, 160]}
          domain={[0, 160]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
          }}
        />
        <Bar
          dataKey="email"
          stackId="a"
          fill="#3b82f6"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="chat"
          stackId="a"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

