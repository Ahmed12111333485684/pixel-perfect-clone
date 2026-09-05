import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type CommercialListing,
  type Lead,
  type RequestListItem,
  type ResidentialSeeker,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { buildClients, formatPhone, type ClientRecord, type ClientRecordKind } from "@/lib/clients";
import {
  commercialListingToClientRecord,
  leadToClientRecord,
  requestRecordToClientRecord,
  residentialSeekerToClientRecord,
} from "@/lib/clientRecords";
import { PageHeader, LoadingBlock, ErrorBlock } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone } from "lucide-react";
import { formatDate } from "@/lib/format";

interface SearchResult<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export const Route = createFileRoute("/app/clients/$id")({
  component: ClientDetailPage,
});

const KIND_ORDER: { key: ClientRecordKind; labelKey: string }[] = [
  { key: "seeker", labelKey: "clients.kindSeekers" },
  { key: "listing", labelKey: "clients.kindListings" },
  { key: "lead", labelKey: "clients.kindLeads" },
  { key: "request", labelKey: "clients.kindRequests" },
];

function useClientData(enabled: boolean | undefined) {
  const fetchAllPages =
    <T,>(path: string) =>
    async () => {
      const fetchPage = (pageNumber: number) =>
        api<SearchResult<T>>(path, { query: { page: pageNumber, pageSize: 100 } });
      const first = await fetchPage(1);
      const totalPages = Math.max(1, Math.ceil((first.total ?? 0) / 100));
      if (totalPages === 1) return first.items ?? [];
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2)),
      );
      return [...(first.items ?? []), ...rest.flatMap((result) => result.items ?? [])];
    };

  const requests = useQuery<RequestListItem[]>({
    queryKey: ["clients", "requests"],
    queryFn: fetchAllPages<RequestListItem>("/requests"),
    enabled,
  });
  const seekers = useQuery<ResidentialSeeker[]>({
    queryKey: ["clients", "residential-seekers"],
    queryFn: fetchAllPages<ResidentialSeeker>("/residential-seekers"),
    enabled,
  });
  const listings = useQuery<CommercialListing[]>({
    queryKey: ["clients", "listings"],
    queryFn: fetchAllPages<CommercialListing>("/listings"),
    enabled,
  });
  const leads = useQuery<Lead[]>({
    queryKey: ["clients", "leads"],
    queryFn: () => api<Lead[]>("/leads"),
    enabled,
  });

  const allRecords = useMemo(
    () => [
      ...(requests.data ?? []).map(requestRecordToClientRecord),
      ...(seekers.data ?? []).map(residentialSeekerToClientRecord),
      ...(listings.data ?? []).map(commercialListingToClientRecord),
      ...(leads.data ?? []).map(leadToClientRecord),
    ],
    [requests.data, seekers.data, listings.data, leads.data],
  );

  const clients = useMemo(() => buildClients(allRecords), [allRecords]);
  const loading = requests.isLoading || seekers.isLoading || listings.isLoading || leads.isLoading;
  const error = requests.error || seekers.error || listings.error || leads.error;

  return { clients, loading, error };
}

function ClientDetailPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const { id } = Route.useParams();

  const hasAccess = auth.hasRole("Admin") || auth.user?.screenPermissions.includes("/app/clients");
  const { clients, loading, error } = useClientData(hasAccess);

  const client = useMemo(() => clients.find((c) => c.id === id), [clients, id]);

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.noScreenAccess")}
      </div>
    );
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock error={error} />;
  if (!client) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("error.notFound")}
      </div>
    );
  }

  const sections = KIND_ORDER.map(({ key, labelKey }) => ({
    key,
    labelKey,
    records: client.records.filter((record) => record.kind === key),
  })).filter((section) => section.records.length > 0);

  return (
    <div>
      <Link
        to="/app/clients"
        search={{ q: "", page: 1, sort: "recent", kind: "all" }}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {client.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold">{client.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {client.phones.map((phone, index) => (
                  <span key={index} dir="ltr" className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(phone)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {client.records.some((record) => record.kind === "seeker") && (
              <Badge>
                {t("clients.kindSeekers")} {client.counts.seeker}
              </Badge>
            )}
            {client.records.some((record) => record.kind === "listing") && (
              <Badge>
                {t("clients.kindListings")} {client.counts.listing}
              </Badge>
            )}
            {client.records.some((record) => record.kind === "lead") && (
              <Badge>
                {t("clients.kindLeads")} {client.counts.lead}
              </Badge>
            )}
            {client.records.some((record) => record.kind === "request") && (
              <Badge>
                {t("clients.kindRequests")} {client.counts.request}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="mt-4 text-sm text-muted-foreground">{t("common.empty")}</div>
      ) : (
        <div className="mt-6 space-y-6">
          {sections.map((section) => (
            <section key={section.key}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                {t("clients.sectionTitle", {
                  kind: t(section.labelKey),
                  count: section.records.length,
                })}
              </h3>
              <div className="space-y-2">
                {section.records.map((record) => (
                  <RecordRow key={`${record.kind}-${record.id}`} record={record} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordRow({ record }: { record: ClientRecord }) {
  const { t } = useTranslation();
  const content = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
      <span className="font-mono font-medium text-muted-foreground">
        {formatDate(record.createdAt)}
      </span>
      {record.fields.map((field) => (
        <span key={field.label} className="text-muted-foreground">
          <span className="font-medium text-foreground/80">
            {t(`clients.field.${field.label}`)}:
          </span>{" "}
          {field.value}
        </span>
      ))}
    </div>
  );

  if (!record.link) return content;
  return (
    <Link
      to={record.link.to as never}
      search={record.link.search as never}
      className="block rounded-lg transition-colors hover:ring-1 hover:ring-ring"
    >
      {content}
    </Link>
  );
}

export default ClientDetailPage;
