import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/leads/$id")({
  component: LeadRedirect,
});

function LeadRedirect() {
  // Lead details are shown inline on the leads board, so redirect there and
  // auto-open the item via the `selected` search param.
  const { id } = Route.useParams();
  return <Navigate to="/app/leads" search={{ selected: Number(id) }} />;
}
