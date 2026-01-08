import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/$tenant/app/sales/crm")({
	component: CRMLayout,
});

function CRMLayout() {
	return <Outlet />;
}
