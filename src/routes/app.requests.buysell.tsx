import { createFileRoute } from "@tanstack/react-router";
import { RequestsPage } from "./app.requests";

export const Route = createFileRoute("/app/requests/buysell")({
  component: () => <RequestsPage filterMode="buysell" />,
});