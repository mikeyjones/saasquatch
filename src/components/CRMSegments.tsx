interface Segment {
  id: string
  label: string
  count: number
}

interface CRMSegmentsProps {
  segments: Segment[]
  activeSegment: string
  onSegmentChange: (segmentId: string) => void
}

export function CRMSegments({ segments, activeSegment, onSegmentChange }: CRMSegmentsProps) {
  return (
    <div className="flex border-b border-gray-200">
      {segments.map((segment) => {
        const isActive = segment.id === activeSegment
        return (
          <button
            key={segment.id}
            onClick={() => onSegmentChange(segment.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {segment.label}
            <span
              className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                isActive
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {segment.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

