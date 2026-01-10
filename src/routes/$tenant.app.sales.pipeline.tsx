import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipelineKanban } from "@/components/PipelineKanban";
import { CreateDealDialog } from "@/components/CreateDealDialog";

interface Pipeline {
	id: string;
	name: string;
	tenantOrganization: {
		id: string;
		name: string;
		slug: string;
	} | null;
	stages: {
		id: string;
		name: string;
		order: number;
		color: string;
	}[];
}

export const Route = createFileRoute("/$tenant/app/sales/pipeline")({
	component: PipelinePage,
});

function PipelinePage() {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";

	const [pipelines, setPipelines] = useState<Pipeline[]>([]);
	const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(
		null,
	);
	const [showPipelineSelector, setShowPipelineSelector] = useState(false);
	const [showCreateDeal, setShowCreateDeal] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	// Fetch pipelines
	useEffect(() => {
		if (!tenant) return;

		const loadPipelines = async () => {
			try {
				const response = await fetch(`/${tenant}/api/pipelines`);
				const data = await response.json();
				setPipelines(data.pipelines || []);

				// Select the first pipeline if none selected
				if (data.pipelines?.length > 0 && !selectedPipeline) {
					setSelectedPipeline(data.pipelines[0]);
				}
			} catch (error) {
				console.error("Failed to fetch pipelines:", error);
			}
		};

		loadPipelines();
	}, [tenant, selectedPipeline]);

	const handlePipelineChange = useCallback((pipeline: Pipeline) => {
		setSelectedPipeline(pipeline);
	}, []);

	const handleDealCreated = () => {
		// Refresh the kanban board
		setRefreshKey((prev) => prev + 1);
	};

	const handleSelectPipeline = (pipeline: Pipeline) => {
		setSelectedPipeline(pipeline);
		setShowPipelineSelector(false);
	};

	return (
		<main className="flex-1 overflow-auto p-6">
			{/* Page Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					{/* Pipeline Selector */}
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowPipelineSelector(!showPipelineSelector)}
							className="flex items-center gap-2 text-2xl font-semibold text-gray-900 hover:text-gray-700 transition-colors"
						>
							{selectedPipeline?.name || "Select Pipeline"}
							<ChevronDown
								size={20}
								className={`transition-transform ${showPipelineSelector ? "rotate-180" : ""}`}
							/>
						</button>

						{/* Pipeline Dropdown */}
						{showPipelineSelector && pipelines.length > 0 && (
							<>
								<button
									type="button"
									className="fixed inset-0 z-10"
									onClick={() => setShowPipelineSelector(false)}
									aria-label="Close pipeline selector"
								/>
								<div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
									{pipelines.map((pipeline) => (
										<button
											type="button"
											key={pipeline.id}
											onClick={() => handleSelectPipeline(pipeline)}
											className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
												selectedPipeline?.id === pipeline.id
													? "bg-indigo-50 text-indigo-700"
													: "text-gray-700"
											}`}
										>
											<div className="font-medium">{pipeline.name}</div>
											{pipeline.tenantOrganization && (
												<div className="text-xs text-gray-500">
													{pipeline.tenantOrganization.name}
												</div>
											)}
										</button>
									))}
								</div>
							</>
						)}
					</div>

					{/* Tenant Org Badge */}
					{selectedPipeline?.tenantOrganization && (
						<span className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full">
							{selectedPipeline.tenantOrganization.name}
						</span>
					)}
				</div>

				<div className="flex items-center gap-3">
					<Button variant="outline" className="text-gray-600">
						All Users
						<ChevronDown size={16} className="ml-1" />
					</Button>
					<Button
						onClick={() => setShowCreateDeal(true)}
						className="bg-indigo-500 hover:bg-indigo-600 text-white"
					>
						<Plus size={16} className="mr-1" />
						Add Deal
					</Button>
				</div>
			</div>

			{/* Kanban Board */}
			<PipelineKanban
				key={`${selectedPipeline?.id}-${refreshKey}`}
				pipelineId={selectedPipeline?.id}
				onPipelineChange={handlePipelineChange}
				onDealsChange={handleDealCreated}
			/>

			{/* Create Deal Dialog */}
			<CreateDealDialog
				open={showCreateDeal}
				onOpenChange={setShowCreateDeal}
				onDealCreated={handleDealCreated}
				defaultPipelineId={selectedPipeline?.id}
				defaultStageId={selectedPipeline?.stages?.[0]?.id}
			/>
		</main>
	);
}
