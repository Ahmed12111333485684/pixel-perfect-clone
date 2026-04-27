import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/leads/$id')({
  component: LeadReviewPage,
})

function LeadReviewPage() {
  const { id } = Route.useParams()
  // your lead review UI here
}