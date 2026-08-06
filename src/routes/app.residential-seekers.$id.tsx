import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/residential-seekers/$id")({
  component: ResidentialSeekersRedirect,
});

function ResidentialSeekersRedirect() {
  // Residential seeker details are shown in a dialog on the list page, so
  // redirect there and auto-open the item via the `selected` search param.
  const { id } = Route.useParams();
  return <Navigate to="/app/residential-seekers" search={{ selected: Number(id) }} />;
}
