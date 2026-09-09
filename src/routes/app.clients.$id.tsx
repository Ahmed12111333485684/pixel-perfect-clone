import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type CommercialListing,
  type Lead,
  type LeadStatus,
  type RequestListItem,
  type ResidentialSeeker,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { buildClients, waHref, type ClientRecord, type ClientRecordKind } from "@/lib/clients";
import {
  commercialListingToClientRecord,
  leadToClientRecord,
  requestRecordToClientRecord,
  residentialSeekerToClientRecord,
} from "@/lib/clientRecords";
import { LoadingBlock, ErrorBlock, EmptyState, StatusBadge } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyNumber } from "@/components/CopyNumber";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { ArrowLeft, ChevronDown, Search, User } from "lucide-react";
import { formatDate, leadStatusTone } from "@/lib/format";
import { matchesQuery, useUrlSearchState } from "@/lib/search";

interface SearchResult<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

type ClientSort = "recent" | "name";
type ClientKindFilter = "all" | "requests" | "listings" | "leads";

export const Route = createFileRoute("/app/clients/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    page: typeof search.page === "number" && search.page > 0 ? search.page : 1,
    sort: search.sort === "name" ? "name" : ("recent" as ClientSort),
    kind: ["all", "requests", "listings", "leads"].includes(search.kind as string)
      ? (search.kind as ClientKindFilter)
      : ("all" as ClientKindFilter),
  }),
  component: ClientDetailPage,
});

const KIND_ORDER: { key: ClientRecordKind; labelKey: string }[] = [
  { key: "seeker", labelKey: "clients.kindSeekers" },
  { key: "listing", labelKey: "clients.kindListings" },
  { key: "lead", labelKey: "clients.kindLeads" },
  { key: "request", labelKey: "clients.kindRequests" },
];

const STATUS_LABEL_BY_KIND: Record<ClientRecordKind, string> = {
  request: "status",
  seeker: "status",
  listing: "listingStatus",
  lead: "leadStatus",
};

function statusTone(
  kind: ClientRecordKind,
  value: string,
): "success" | "warning" | "destructive" | "info" | "neutral" {
  if (kind === "lead") return leadStatusTone(value as LeadStatus);
  if (value === "تم") return "success";
  if (value === "لم يتم") return "warning";
  return "neutral";
}

function recordHeadline(record: ClientRecord): string {
  const value = (label: string) => record.fields.find((f) => f.label === label)?.value ?? "";
  switch (record.kind) {
    case "seeker":
      return value("serialNumber") || value("listingType");
    case "listing":
      return value("offerCode") || value("propertyType");
    case "lead":
      return value("propertyName") || value("intent");
    default:
      return value("requestType") || value("location");
  }
}

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

  const [urlState, setUrlState] = useUrlSearchState(Route, {
    q: "",
    page: 1,
    sort: "recent" as ClientSort,
    kind: "all" as ClientKindFilter,
  });
  const { q, page, sort, kind } = urlState;
  const setQ = (value: string) => setUrlState({ q: value });
  const setKind = (value: ClientKindFilter) => setUrlState({ kind: value });

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

  const visibleRecords = client.records.filter((record) => {
    const kindMatch =
      kind === "all" ||
      (kind === "requests" && (record.kind === "seeker" || record.kind === "request")) ||
      (kind === "listings" && record.kind === "listing") ||
      (kind === "leads" && record.kind === "lead");
    const queryMatch =
      !q.trim() ||
      matchesQuery([record.name, record.phones, ...record.fields.map((field) => field.value)], q);
    return kindMatch && queryMatch;
  });

  const sections = KIND_ORDER.map(({ key, labelKey }) => ({
    key,
    labelKey,
    records: visibleRecords.filter((record) => record.kind === key),
  })).filter((section) => section.records.length > 0);

  const filterOptions: { value: ClientKindFilter; labelKey: string; count: number }[] = [
    { value: "all", labelKey: "clients.filterAll", count: client.count },
    {
      value: "requests",
      labelKey: "clients.kindRequests",
      count: client.counts.seeker + client.counts.request,
    },
    { value: "listings", labelKey: "clients.kindListings", count: client.counts.listing },
    { value: "leads", labelKey: "clients.kindLeads", count: client.counts.lead },
  ];

  return (
    <div>
      <Link
        to="/app/clients"
        search={{ q, page, sort, kind }}
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
                  <span key={index} className="inline-flex items-center gap-1.5">
                    <CopyNumber phone={phone} className="text-foreground" />
                    <a
                      href={waHref(phone)}
                      target="_blank"
                      rel="noreferrer"
                      title={t("clients.whatsapp")}
                      aria-label={t("clients.whatsapp")}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-green-600"
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5" />
                    </a>
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

      <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-[220px] sm:max-w-sm">
          <Label htmlFor="client-records-q" className="text-xs font-medium">
            {t("clients.searchSerial")}
          </Label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="client-records-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full ps-9"
              placeholder={t("clients.searchSerial")}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={kind === option.value ? "default" : "outline"}
              onClick={() => setKind(option.value)}
            >
              {t(option.labelKey)} {option.count}
            </Button>
          ))}
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="mt-4">
          <EmptyState message={t("clients.noRecords")} icon={<User className="h-8 w-8" />} />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visibleRecords.length < client.count && (
            <div className="text-sm text-muted-foreground">
              {t("clients.records", { count: visibleRecords.length })}
            </div>
          )}
          {sections.map((section) => (
            <details key={section.key} open className="group/details">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm font-semibold text-foreground/80 [&::-webkit-details-marker]:hidden">
                <span>
                  {t("clients.sectionTitle", {
                    kind: t(section.labelKey),
                    count: section.records.length,
                  })}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/details:rotate-180" />
              </summary>
              <div className="mt-2 space-y-2">
                {section.records.map((record) => (
                  <RecordRow key={`${record.kind}-${record.id}`} record={record} />
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordRow({ record }: { record: ClientRecord }) {
  const { t } = useTranslation();
  const headline = recordHeadline(record);
  const statusLabel = STATUS_LABEL_BY_KIND[record.kind];
  const statusField = record.fields.find((field) => field.label === statusLabel);
  const remainingFields = statusField
    ? record.fields.filter((field) => field !== statusField)
    : record.fields;

  const content = (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {headline && <div className="truncate font-semibold">{headline}</div>}
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">
            {formatDate(record.createdAt)}
          </div>
        </div>
        {statusField?.value && (
          <StatusBadge tone={statusTone(record.kind, statusField.value)}>
            {statusField.value}
          </StatusBadge>
        )}
      </div>
      {remainingFields.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {remainingFields.map((field) => (
            <span key={field.label}>
              <span className="font-medium text-foreground/80">
                {t(`clients.field.${field.label}`)}:
              </span>{" "}
              {field.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (!record.link) return content;
  return (
    <Link
      to={record.link.to as never}
      search={record.link.search as never}
      className="block transition-colors hover:ring-1 hover:ring-ring"
    >
      {content}
    </Link>
  );
}

export default ClientDetailPage;
