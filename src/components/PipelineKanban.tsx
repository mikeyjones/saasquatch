import { useState, useEffect, useCallback } from "react";
import { useParams } from "@tanstack/react-router";
import {
	DndContext,
	DragOverlay,
	closestCorners,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
	type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { PipelineColumn } from "./PipelineColumn";
import { DealCard } from "./DealCard";
import { Loader2 } from "lucide-react";

export interface PipelineStage {
	id: string;
	name: string;
	order: number;
	color: string;
}

export interface Deal {
	id: string;
	name: string;
	company: string;
	value: number;
	stageId: string;
	stage: {
		id: string;
		name: string;
		order: number;
		color: string;
	};
	assignedTo: {
		id: string;
		name: string;
		avatar?: string;
	} | null;
	lastUpdated: string;
	badges: string[];
}

interface Pipeline {
	id: string;
	name: string;
	stages: PipelineStage[];
	tenantOrganization: {
		id: string;
		name: string;
		slug: string;
	} | null;
}

interface PipelineKanbanProps {
	filterUserId?: string;
	pipelineId?: string;
	onPipelineChange?: (pipeline: Pipeline) => void;
	onDealsChange?: () => void;
}

// Map color names to Tailwind classes
const colorToClasses: Record<
	string,
	{ color: string; bgColor: string; dotColor: string }
> = {
	gray: {
		color: "text-gray-500",
		bgColor: "bg-gray-400",
		dotColor: "bg-gray-400",
	},
	blue: {
		color: "text-blue-500",
		bgColor: "bg-blue-500",
		dotColor: "bg-blue-500",
	},
	sky: {
		color: "text-sky-500",
		bgColor: "bg-sky-500",
		dotColor: "bg-sky-500",
	},
	amber: {
		color: "text-amber-500",
		bgColor: "bg-amber-500",
		dotColor: "bg-amber-500",
	},
	emerald: {
		color: "text-emerald-500",
		bgColor: "bg-emerald-500",
		dotColor: "bg-emerald-500",
	},
	rose: {
		color: "text-rose-500",
		bgColor: "bg-rose-500",
		dotColor: "bg-rose-500",
	},
	violet: {
		color: "text-violet-500",
		bgColor: "bg-violet-500",
		dotColor: "bg-violet-500",
	},
};

function getColorClasses(colorName: string) {
	return (
		colorToClasses[colorName] || {
			color: "text-gray-500",
			bgColor: "bg-gray-400",
			dotColor: "bg-gray-400",
		}
	);
}

export function PipelineKanban({
	filterUserId,
	pipelineId,
	onPipelineChange,
	onDealsChange,
}: PipelineKanbanProps) {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";

	const [_pipelines, setPipelines] = useState<Pipeline[]>([]);
	const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(
		null,
	);
	const [deals, setDeals] = useState<Deal[]>([]);
	const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isUpdating, setIsUpdating] = useState(false);

	// Fetch pipelines
	useEffect(() => {
		if (!tenant) return;

		const loadPipelines = async () => {
			try {
				const response = await fetch(`/api/tenant/${tenant}/pipelines`);
				const data = await response.json();
				setPipelines(data.pipelines || []);

				// Select the first pipeline or the one matching pipelineId
				if (data.pipelines?.length > 0) {
					const targetPipeline = pipelineId
						? data.pipelines.find((p: Pipeline) => p.id === pipelineId)
						: data.pipelines[0];

					if (targetPipeline) {
						setSelectedPipeline(targetPipeline);
						onPipelineChange?.(targetPipeline);
					}
				}
			} catch (error) {
				console.error("Failed to fetch pipelines:", error);
			}
		};

		loadPipelines();
	}, [tenant, pipelineId, onPipelineChange]);

	// Fetch deals when pipeline is selected
	useEffect(() => {
		if (!tenant || !selectedPipeline) {
			setIsLoading(false);
			return;
		}

		const loadDeals = async () => {
			setIsLoading(true);
			try {
				const response = await fetch(
					`/api/tenant/${tenant}/deals?pipelineId=${selectedPipeline.id}`,
				);
				const data = await response.json();
				setDeals(data.deals || []);
			} catch (error) {
				console.error("Failed to fetch deals:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadDeals();
	}, [tenant, selectedPipeline]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const filteredDeals = filterUserId
		? deals.filter((deal) => deal.assignedTo?.id === filterUserId)
		: deals;

	const getDealsByStage = useCallback(
		(stageId: string) => {
			return filteredDeals.filter((deal) => deal.stageId === stageId);
		},
		[filteredDeals],
	);

	const getTotalPotential = useCallback(
		(stageId: string) => {
			return getDealsByStage(stageId).reduce(
				(sum, deal) => sum + deal.value,
				0,
			);
		},
		[getDealsByStage],
	);

	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event;
		const deal = deals.find((d) => d.id === active.id);
		if (deal) {
			setActiveDeal(deal);
		}
	};

	const handleDragOver = (event: DragOverEvent) => {
		const { active, over } = event;

		if (!over || !selectedPipeline) return;

		const activeId = active.id as string;
		const overId = over.id as string;

		// Find the deal being dragged
		const activeDealData = deals.find((d) => d.id === activeId);
		if (!activeDealData) return;

		// Check if we're dropping over a column (stage)
		const overStage = selectedPipeline.stages.find((s) => s.id === overId);
		if (overStage && activeDealData.stageId !== overStage.id) {
			// Optimistically update the UI
			setDeals((prev) =>
				prev.map((deal) =>
					deal.id === activeId
						? {
								...deal,
								stageId: overStage.id,
								stage: overStage,
							}
						: deal,
				),
			);
			return;
		}

		// Check if we're dropping over another deal
		const overDeal = deals.find((d) => d.id === overId);
		if (overDeal && activeDealData.stageId !== overDeal.stageId) {
			// Optimistically update the UI
			setDeals((prev) =>
				prev.map((deal) =>
					deal.id === activeId
						? {
								...deal,
								stageId: overDeal.stageId,
								stage: overDeal.stage,
							}
						: deal,
				),
			);
		}
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;

		setActiveDeal(null);

		if (!over || !selectedPipeline || !tenant) return;

		const activeId = active.id as string;
		const overId = over.id as string;

		// Find the deal being dragged
		const activeDealData = deals.find((d) => d.id === activeId);
		if (!activeDealData) return;

		// Check if dropping over a stage
		const overStage = selectedPipeline.stages.find((s) => s.id === overId);
		let targetStageId = activeDealData.stageId;

		if (overStage) {
			targetStageId = overStage.id;
		} else {
			// Check if dropping over another deal
			const overDeal = deals.find((d) => d.id === overId);
			if (overDeal) {
				targetStageId = overDeal.stageId;
			}
		}

		// Update the deal in the database
		if (targetStageId !== activeDealData.stageId) {
			// Already optimistically updated, now persist to DB
			setIsUpdating(true);
			try {
				const response = await fetch(
					`/api/tenant/${tenant}/deals/${activeId}`,
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ stageId: targetStageId }),
					},
				);

				if (!response.ok) {
					// Revert on error
					const originalStage = selectedPipeline.stages.find(
						(s) => s.id === activeDealData.stageId,
					);
					setDeals((prev) =>
						prev.map((deal) =>
							deal.id === activeId
								? {
										...deal,
										stageId: activeDealData.stageId,
										stage: originalStage || activeDealData.stage,
									}
								: deal,
						),
					);
					console.error("Failed to update deal stage");
				} else {
					onDealsChange?.();
				}
			} catch (error) {
				console.error("Error updating deal:", error);
				// Revert on error
				const originalStage = selectedPipeline.stages.find(
					(s) => s.id === activeDealData.stageId,
				);
				setDeals((prev) =>
					prev.map((deal) =>
						deal.id === activeId
							? {
									...deal,
									stageId: activeDealData.stageId,
									stage: originalStage || activeDealData.stage,
								}
							: deal,
					),
				);
			} finally {
				setIsUpdating(false);
			}
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
			</div>
		);
	}

	if (!selectedPipeline) {
		return (
			<div className="flex items-center justify-center h-64 text-gray-500">
				No pipeline selected. Create a pipeline to get started.
			</div>
		);
	}

	const stages = selectedPipeline.stages
		.sort((a, b) => a.order - b.order)
		.map((stage) => ({
			...stage,
			...getColorClasses(stage.color),
		}));

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
		>
			<div className="flex gap-4 overflow-x-auto pb-4 min-w-0">
				{stages.map((stage) => (
					<PipelineColumn
						key={stage.id}
						stage={stage}
						deals={getDealsByStage(stage.id)}
						totalPotential={getTotalPotential(stage.id)}
					/>
				))}
			</div>

			<DragOverlay>
				{activeDeal ? (
					<div className="rotate-3 scale-105">
						<DealCard deal={activeDeal} />
					</div>
				) : null}
			</DragOverlay>

			{/* Loading overlay during updates */}
			{isUpdating && (
				<div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
						<Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
						<span className="text-sm text-gray-600">Updating...</span>
					</div>
				</div>
			)}
		</DndContext>
	);
}
