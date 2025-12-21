import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PipelineFunnelChart } from './PipelineFunnelChart'

const mockData = [
	{ stage: 'Lead', value: 100, maxValue: 100 },
	{ stage: 'Qualified', value: 60, maxValue: 100 },
	{ stage: 'Proposal', value: 30, maxValue: 100 },
	{ stage: 'Won', value: 15, maxValue: 100 },
]

describe('PipelineFunnelChart', () => {
	describe('Render Behavior', () => {
		it('should render all stage labels', () => {
			render(<PipelineFunnelChart data={mockData} />)

			expect(screen.getByText('Lead')).toBeInTheDocument()
			expect(screen.getByText('Qualified')).toBeInTheDocument()
			expect(screen.getByText('Proposal')).toBeInTheDocument()
			expect(screen.getByText('Won')).toBeInTheDocument()
		})

		it('should render funnel bars', () => {
			const { container } = render(<PipelineFunnelChart data={mockData} />)

			// Should have 4 bars
			const bars = container.querySelectorAll('.bg-gradient-to-r')
			expect(bars).toHaveLength(4)
		})

		it('should set correct percentage widths', () => {
			const { container } = render(<PipelineFunnelChart data={mockData} />)

			const bars = container.querySelectorAll('.bg-gradient-to-r')

			// Lead should be 100%
			expect(bars[0]).toHaveStyle({ width: '100%' })

			// Qualified should be 60%
			expect(bars[1]).toHaveStyle({ width: '60%' })

			// Proposal should be 30%
			expect(bars[2]).toHaveStyle({ width: '30%' })

			// Won should be 15%
			expect(bars[3]).toHaveStyle({ width: '15%' })
		})
	})

	describe('Empty Data', () => {
		it('should render nothing with empty data', () => {
			const { container } = render(<PipelineFunnelChart data={[]} />)

			const bars = container.querySelectorAll('.bg-gradient-to-r')
			expect(bars).toHaveLength(0)
		})
	})

	describe('Zero Values', () => {
		it('should handle zero values correctly', () => {
			const zeroData = [{ stage: 'Empty', value: 0, maxValue: 100 }]
			const { container } = render(<PipelineFunnelChart data={zeroData} />)

			const bars = container.querySelectorAll('.bg-gradient-to-r')
			expect(bars[0]).toHaveStyle({ width: '0%' })
		})
	})
})

