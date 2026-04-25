import { createFileRoute } from "@tanstack/react-router";
import { PeopleResource } from "./app.tenants";

export const Route = createFileRoute("/app/buyers")({
  component: () => <PeopleResource resource="buyers" queryKey="buyers" titleKey="nav.buyers" />,
});
