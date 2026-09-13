import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/available-properties")({
  component: AvailablePropertiesLayout,
});

function AvailablePropertiesLayout() {
  return <Outlet />;
}
