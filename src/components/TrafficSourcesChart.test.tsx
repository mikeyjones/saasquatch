import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrafficSourcesChart } from "./TrafficSourcesChart";

// Mock recharts to avoid complex SVG rendering in tests
vi.mock("recharts", () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-container">{children}</div>
	),
	AreaChart: ({
		children,
		data,
	}: {
		children: React.ReactNode;
		data: unknown[];
	}) => (
		<div data-testid="area-chart" data-length={data.length}>
			{children}
		</div>
	),
	Area: ({ dataKey }: { dataKey: string }) => (
		<div data-testid={`area-${dataKey}`} />
	),
	XAxis: ({ dataKey }: { dataKey: string }) => (
		<div data-testid={`xaxis-${dataKey}`} />
	),
	YAxis: () => <div data-testid="yaxis" />,
	CartesianGrid: () => <div data-testid="cartesian-grid" />,
	Tooltip: () => <div data-testid="tooltip" />,
}));

const mockData = [
	{ day: "Mon", organic: 5000, paid: 2000 },
	{ day: "Tue", organic: 5500, paid: 2200 },
	{ day: "Wed", organic: 6000, paid: 2500 },
	{ day: "Thu", organic: 5800, paid: 2300 },
	{ day: "Fri", organic: 7000, paid: 3000 },
];

describe("TrafficSourcesChart", () => {
	describe("Render Behavior", () => {
		it("should render responsive container", () => {
			const { getByTestId } = render(<TrafficSourcesChart data={mockData} />);

			expect(getByTestId("responsive-container")).toBeInTheDocument();
		});

		it("should render area chart", () => {
			const { getByTestId } = render(<TrafficSourcesChart data={mockData} />);

			expect(getByTestId("area-chart")).toBeInTheDocument();
		});

		it("should render with correct data length", () => {
			const { getByTestId } = render(<TrafficSourcesChart data={mockData} />);

			expect(getByTestId("area-chart")).toHaveAttribute("data-length", "5");
		});

		it("should render XAxis with day dataKey", () => {
			const { getByTestId } = render(<TrafficSourcesChart data={mockData} />);

			expect(getByTestId("xaxis-day")).toBeInTheDocument();
		});

		it("should render organic area", () => {
			const { getByTestId } = render(<TrafficSourcesChart data={mockData} />);

			expect(getByTestId("area-organic")).toBeInTheDocument();
		});

		it("should render paid area", () => {
			const { getByTestId } = render(<TrafficSourcesChart data={mockData} />);

			expect(getByTestId("area-paid")).toBeInTheDocument();
		});

		it("should render cartesian grid", () => {
			const { getByTestId } = render(<TrafficSourcesChart data={mockData} />);

			expect(getByTestId("cartesian-grid")).toBeInTheDocument();
		});

		it("should render tooltip", () => {
			const { getByTestId } = render(<TrafficSourcesChart data={mockData} />);

			expect(getByTestId("tooltip")).toBeInTheDocument();
		});
	});

	describe("Empty Data", () => {
		it("should render chart with empty data", () => {
			const { getByTestId } = render(<TrafficSourcesChart data={[]} />);

			expect(getByTestId("area-chart")).toHaveAttribute("data-length", "0");
		});
	});
});
