import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/$tenant/app/support/members")({
	component: MembersLayout,
});

function MembersLayout() {
	return <Outlet />;
}
