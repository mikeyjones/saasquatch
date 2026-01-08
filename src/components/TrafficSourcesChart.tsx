import { useId } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

interface TrafficSourcesChartProps {
	data: Array<{ day: string; organic: number; paid: number }>;
}

export function TrafficSourcesChart({ data }: TrafficSourcesChartProps) {
	const organicGradientId = useId();
	const paidGradientId = useId();
	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart data={data}>
				<defs>
					<linearGradient id={organicGradientId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
						<stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
					</linearGradient>
					<linearGradient id={paidGradientId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
						<stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
					</linearGradient>
				</defs>
				<CartesianGrid
					strokeDasharray="3 3"
					vertical={false}
					stroke="#f0f0f0"
				/>
				<XAxis
					dataKey="day"
					axisLine={false}
					tickLine={false}
					tick={{ fill: "#6b7280", fontSize: 12 }}
				/>
				<YAxis
					axisLine={false}
					tickLine={false}
					tick={{ fill: "#6b7280", fontSize: 12 }}
					ticks={[0, 2500, 5000, 7500, 10000]}
					domain={[0, 10000]}
				/>
				<Tooltip
					contentStyle={{
						backgroundColor: "#1f2937",
						border: "none",
						borderRadius: "8px",
						color: "#fff",
					}}
					formatter={(value: number, name: string) => [
						value.toLocaleString(),
						name === "organic" ? "Organic" : "Paid",
					]}
				/>
				<Area
					type="monotone"
					dataKey="organic"
					stroke="#3b82f6"
					strokeWidth={2}
					fill={`url(#${organicGradientId})`}
				/>
				<Area
					type="monotone"
					dataKey="paid"
					stroke="#ef4444"
					strokeWidth={2}
					fill={`url(#${paidGradientId})`}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}
