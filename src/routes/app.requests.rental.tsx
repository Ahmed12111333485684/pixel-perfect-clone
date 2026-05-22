import { createFileRoute } from "@tanstack/react-router";
import { RequestsPage } from "./app.requests";

export const Route = createFileRoute("/app/requests/rental")({
  component: () => <RequestsPage filterMode="rental" />,
});
