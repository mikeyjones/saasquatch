interface PipelineFunnelChartProps {
  data: Array<{ stage: string; value: number; maxValue: number }>
}

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
  return (
    <div className="flex flex-col gap-3 h-full justify-center">
      {data.map((item) => {
        const percentage = (item.value / item.maxValue) * 100
        return (
          <div key={item.stage} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20 text-right">{item.stage}</span>
            <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-300 rounded transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}


