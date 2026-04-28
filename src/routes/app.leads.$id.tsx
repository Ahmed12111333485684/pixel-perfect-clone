import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/leads/$id")({
  component: LeadRedirect,
});

function LeadRedirect() {
  // Lead details are shown inline on the leads board.
  return <Navigate to="/app/leads" />;
}
