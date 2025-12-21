import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TicketVolumeChart } from "./TicketVolumeChart";

// Mock recharts to avoid complex SVG rendering in tests
vi.mock("recharts", () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-container">{children}</div>
	),
	BarChart: ({
		children,
		data,
	}: {
		children: React.ReactNode;
		data: unknown[];
	}) => (
		<div data-testid="bar-chart" data-length={data.length}>
			{children}
		</div>
	),
	Bar: ({ dataKey }: { dataKey: string }) => (
		<div data-testid={`bar-${dataKey}`} />
	),
	XAxis: ({ dataKey }: { dataKey: string }) => (
		<div data-testid={`xaxis-${dataKey}`} />
	),
	YAxis: () => <div data-testid="yaxis" />,
	CartesianGrid: () => <div data-testid="cartesian-grid" />,
	Tooltip: () => <div data-testid="tooltip" />,
}));

const mockData = [
	{ day: "Mon", chat: 40, email: 60 },
	{ day: "Tue", chat: 35, email: 55 },
	{ day: "Wed", chat: 45, email: 70 },
	{ day: "Thu", chat: 50, email: 65 },
	{ day: "Fri", chat: 30, email: 50 },
];

describe("TicketVolumeChart", () => {
	describe("Render Behavior", () => {
		it("should render responsive container", () => {
			const { getByTestId } = render(<TicketVolumeChart data={mockData} />);

			expect(getByTestId("responsive-container")).toBeInTheDocument();
		});

		it("should render bar chart", () => {
			const { getByTestId } = render(<TicketVolumeChart data={mockData} />);

			expect(getByTestId("bar-chart")).toBeInTheDocument();
		});

		it("should render with correct data length", () => {
			const { getByTestId } = render(<TicketVolumeChart data={mockData} />);

			expect(getByTestId("bar-chart")).toHaveAttribute("data-length", "5");
		});

		it("should render XAxis with day dataKey", () => {
			const { getByTestId } = render(<TicketVolumeChart data={mockData} />);

			expect(getByTestId("xaxis-day")).toBeInTheDocument();
		});

		it("should render email bar", () => {
			const { getByTestId } = render(<TicketVolumeChart data={mockData} />);

			expect(getByTestId("bar-email")).toBeInTheDocument();
		});

		it("should render chat bar", () => {
			const { getByTestId } = render(<TicketVolumeChart data={mockData} />);

			expect(getByTestId("bar-chat")).toBeInTheDocument();
		});

		it("should render cartesian grid", () => {
			const { getByTestId } = render(<TicketVolumeChart data={mockData} />);

			expect(getByTestId("cartesian-grid")).toBeInTheDocument();
		});

		it("should render tooltip", () => {
			const { getByTestId } = render(<TicketVolumeChart data={mockData} />);

			expect(getByTestId("tooltip")).toBeInTheDocument();
		});
	});

	describe("Empty Data", () => {
		it("should render chart with empty data", () => {
			const { getByTestId } = render(<TicketVolumeChart data={[]} />);

			expect(getByTestId("bar-chart")).toHaveAttribute("data-length", "0");
		});
	});
});
