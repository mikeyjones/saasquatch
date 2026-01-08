import { Clock, User } from "lucide-react";

interface AuditLogEntry {
	id: string;
	performedByUserId: string | null;
	performedByName: string;
	action: string;
	fieldName: string | null;
	oldValue: string | null;
	newValue: string | null;
	metadata: string | null;
	createdAt: string;
}

interface AuditLogProps {
	logs: AuditLogEntry[];
	isLoading?: boolean;
}

export function AuditLog({ logs, isLoading }: AuditLogProps) {
	if (isLoading) {
		return (
			<div className="text-center text-muted-foreground py-8">
				Loading activity history...
			</div>
		);
	}

	if (logs.length === 0) {
		return (
			<div className="text-center text-muted-foreground py-8">
				No activity history yet
			</div>
		);
	}

	const formatFieldName = (fieldName: string | null): string => {
		if (!fieldName) return "field";
		return fieldName
			.replace(/_/g, " ")
			.replace(/\b\w/g, (l) => l.toUpperCase());
	};

	const formatValue = (value: string | null): string => {
		if (value === null || value === "null") return "None";
		if (value === "true") return "Yes";
		if (value === "false") return "No";
		return value;
	};

	const getActionDescription = (log: AuditLogEntry): string => {
		const field = formatFieldName(log.fieldName);
		const oldVal = formatValue(log.oldValue);
		const newVal = formatValue(log.newValue);

		if (log.action.includes("_changed")) {
			return `changed ${field} from "${oldVal}" to "${newVal}"`;
		}
		if (log.action === "created") {
			return "created this member";
		}
		if (log.action === "deleted") {
			return "deleted this member";
		}
		return log.action.replace(/_/g, " ");
	};

	const getActionColor = (log: AuditLogEntry): string => {
		if (log.action.includes("role_changed")) {
			return "text-purple-600 dark:text-purple-400";
		}
		if (log.action.includes("status_changed")) {
			return "text-orange-600 dark:text-orange-400";
		}
		return "text-blue-600 dark:text-blue-400";
	};

	return (
		<div className="space-y-4">
			<div className="relative">
				{/* Timeline line */}
				<div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

				{/* Activity items */}
				<div className="space-y-6">
					{logs.map((log) => (
						<div key={log.id} className="relative flex gap-4">
							{/* Timeline dot */}
							<div className="relative flex items-center justify-center">
								<div className="h-8 w-8 rounded-full bg-background border-2 border-border flex items-center justify-center z-10">
									<Clock className="h-4 w-4 text-muted-foreground" />
								</div>
							</div>

							{/* Content */}
							<div className="flex-1 pb-6">
								<div className="bg-card rounded-lg border p-4">
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<User className="h-4 w-4 text-muted-foreground" />
												<span className="font-medium">
													{log.performedByName}
												</span>
												<span className={`text-sm ${getActionColor(log)}`}>
													{getActionDescription(log)}
												</span>
											</div>
											<div className="text-xs text-muted-foreground">
												{new Date(log.createdAt).toLocaleString("en-US", {
													year: "numeric",
													month: "long",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</div>
									</div>

									{/* Show detailed change for important fields */}
									{(log.fieldName === "role" || log.fieldName === "status") && (
										<div className="mt-3 pt-3 border-t text-sm">
											<div className="grid grid-cols-2 gap-4">
												<div>
													<div className="text-xs text-muted-foreground">
														Previous
													</div>
													<div className="font-medium">
														{formatValue(log.oldValue)}
													</div>
												</div>
												<div>
													<div className="text-xs text-muted-foreground">
														New
													</div>
													<div className="font-medium">
														{formatValue(log.newValue)}
													</div>
												</div>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
