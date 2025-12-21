import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { RevenueGrowthChart } from './RevenueGrowthChart'

// Mock recharts to avoid complex SVG rendering in tests
vi.mock('recharts', () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-container">{children}</div>
	),
	AreaChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
		<div data-testid="area-chart" data-length={data.length}>
			{children}
		</div>
	),
	Area: ({ dataKey }: { dataKey: string }) => <div data-testid={`area-${dataKey}`} />,
	XAxis: ({ dataKey }: { dataKey: string }) => <div data-testid={`xaxis-${dataKey}`} />,
	YAxis: () => <div data-testid="yaxis" />,
	CartesianGrid: () => <div data-testid="cartesian-grid" />,
	Tooltip: () => <div data-testid="tooltip" />,
}))

const mockData = [
	{ day: 'Mon', revenue: 1000 },
	{ day: 'Tue', revenue: 1500 },
	{ day: 'Wed', revenue: 2000 },
	{ day: 'Thu', revenue: 1800 },
	{ day: 'Fri', revenue: 2500 },
]

describe('RevenueGrowthChart', () => {
	describe('Render Behavior', () => {
		it('should render responsive container', () => {
			const { getByTestId } = render(<RevenueGrowthChart data={mockData} />)

			expect(getByTestId('responsive-container')).toBeInTheDocument()
		})

		it('should render area chart', () => {
			const { getByTestId } = render(<RevenueGrowthChart data={mockData} />)

			expect(getByTestId('area-chart')).toBeInTheDocument()
		})

		it('should render with correct data length', () => {
			const { getByTestId } = render(<RevenueGrowthChart data={mockData} />)

			expect(getByTestId('area-chart')).toHaveAttribute('data-length', '5')
		})

		it('should render XAxis with day dataKey', () => {
			const { getByTestId } = render(<RevenueGrowthChart data={mockData} />)

			expect(getByTestId('xaxis-day')).toBeInTheDocument()
		})

		it('should render revenue area', () => {
			const { getByTestId } = render(<RevenueGrowthChart data={mockData} />)

			expect(getByTestId('area-revenue')).toBeInTheDocument()
		})

		it('should render cartesian grid', () => {
			const { getByTestId } = render(<RevenueGrowthChart data={mockData} />)

			expect(getByTestId('cartesian-grid')).toBeInTheDocument()
		})

		it('should render tooltip', () => {
			const { getByTestId } = render(<RevenueGrowthChart data={mockData} />)

			expect(getByTestId('tooltip')).toBeInTheDocument()
		})
	})

	describe('Empty Data', () => {
		it('should render chart with empty data', () => {
			const { getByTestId } = render(<RevenueGrowthChart data={[]} />)

			expect(getByTestId('area-chart')).toHaveAttribute('data-length', '0')
		})
	})
})

