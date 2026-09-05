import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type CommercialListing,
  type Lead,
  type RequestListItem,
  type ResidentialSeeker,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  buildClients,
  clientMatchesQuery,
  formatPhone,
  type Client,
  type ClientRecordKind,
} from "@/lib/clients";
import {
  commercialListingToClientRecord,
  leadToClientRecord,
  requestRecordToClientRecord,
  residentialSeekerToClientRecord,
} from "@/lib/clientRecords";
import { PageHeader, EmptyState, LoadingBlock, ErrorBlock } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUrlSearchState } from "@/lib/search";
import { Phone, Search, User } from "lucide-react";

type ClientSort = "recent" | "name";
type ClientKindFilter = "all" | "requests" | "listings" | "leads";

interface SearchResult<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export const Route = createFileRoute("/app/clients")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    page: typeof search.page === "number" && search.page > 0 ? search.page : 1,
    sort: search.sort === "name" ? "name" : ("recent" as ClientSort),
    kind: ["all", "requests", "listings", "leads"].includes(search.kind as string)
      ? (search.kind as ClientKindFilter)
      : ("all" as ClientKindFilter),
  }),
  component: ClientsPage,
});

const KIND_META: {
  key: ClientRecordKind;
  labelKey: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}[] = [
  { key: "request", labelKey: "clients.kindRequests", variant: "secondary" },
  { key: "seeker", labelKey: "clients.kindSeekers", variant: "outline" },
  { key: "listing", labelKey: "clients.kindListings", variant: "default" },
  { key: "lead", labelKey: "clients.kindLeads", variant: "secondary" },
];

function ClientsPage() {
  const { t } = useTranslation();
  const auth = useAuth();

  const [urlState, setUrlState] = useUrlSearchState(Route, {
    q: "",
    page: 1,
    sort: "recent" as ClientSort,
    kind: "all" as ClientKindFilter,
  });
  const { q, page, sort, kind } = urlState;
  const [pageSize] = useState(50);

  const showingDetail = useRouterState({
    select: (state) =>
      state.location.pathname !== "/app/clients" &&
      state.location.pathname.startsWith("/app/clients"),
  });

  const hasAccess = auth.hasRole("Admin") || auth.user?.screenPermissions.includes("/app/clients");

  const setQ = (value: string) => setUrlState({ q: value, page: 1 });
  const setSort = (value: ClientSort) => setUrlState({ sort: value, page: 1 });
  const setKind = (value: ClientKindFilter) => setUrlState({ kind: value, page: 1 });
  const setPage = useCallback(
    (value: number | ((current: number) => number)) =>
      setUrlState((prev) => ({
        page: typeof value === "function" ? value(prev.page) : Math.max(1, value),
      })),
    [setUrlState],
  );

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
    enabled: hasAccess,
  });
  const seekers = useQuery<ResidentialSeeker[]>({
    queryKey: ["clients", "residential-seekers"],
    queryFn: fetchAllPages<ResidentialSeeker>("/residential-seekers"),
    enabled: hasAccess,
  });
  const listings = useQuery<CommercialListing[]>({
    queryKey: ["clients", "listings"],
    queryFn: fetchAllPages<CommercialListing>("/listings"),
    enabled: hasAccess,
  });
  const leads = useQuery<Lead[]>({
    queryKey: ["clients", "leads"],
    queryFn: () => api<Lead[]>("/leads"),
    enabled: hasAccess,
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

  const filtered = useMemo(() => {
    const result = clients.filter(
      (client) =>
        clientMatchesQuery(client, q) &&
        (kind === "all" ||
          (kind === "requests" && client.counts.request + client.counts.seeker > 0) ||
          (kind === "listings" && client.counts.listing > 0) ||
          (kind === "leads" && client.counts.lead > 0)),
    );
    result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    });
    return result;
  }, [clients, q, sort, kind]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.noScreenAccess")}
      </div>
    );
  }

  if (showingDetail) {
    return <Outlet />;
  }

  const loading = requests.isLoading || seekers.isLoading || listings.isLoading || leads.isLoading;
  const error = requests.error || seekers.error || listings.error || leads.error;

  return (
    <div>
      <PageHeader title={t("clients.pageTitle")} subtitle={t("clients.pageSubtitle")} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-[220px] flex-1">
          <Label htmlFor="q" className="text-xs font-medium">
            {t("clients.searchPlaceholder")}
          </Label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full ps-9"
              placeholder={t("clients.searchPlaceholder")}
            />
          </div>
        </div>
        <div className="w-full sm:w-56">
          <Label className="text-xs font-medium">{t("clients.sortLabel")}</Label>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{t("clients.sortRecent")}</SelectItem>
              <SelectItem value="name">{t("clients.sortName")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { value: "all", labelKey: "clients.filterAll" },
            { value: "requests", labelKey: "clients.kindRequests" },
            { value: "listings", labelKey: "clients.kindListings" },
            { value: "leads", labelKey: "clients.kindLeads" },
          ] as { value: ClientKindFilter; labelKey: string }[]
        ).map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={kind === option.value ? "default" : "outline"}
            onClick={() => setKind(option.value)}
          >
            {t(option.labelKey)}
          </Button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : filtered.length === 0 ? (
        <EmptyState message={t("clients.noClients")} icon={<User className="h-8 w-8" />} />
      ) : (
        <>
          <div className="mb-4 text-sm text-muted-foreground">
            {t("clients.count", { count: filtered.length })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pageClients.map((client) => (
              <ClientCard key={client.id} client={client} groupLabel={t} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)}{" "}
                {t("clients.count", { count: filtered.length })}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t("common.previous")}
                </Button>
                <span className="flex items-center text-sm px-1">{page}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClientCard({
  client,
  groupLabel,
}: {
  client: Client;
  groupLabel: (key: string) => string;
}) {
  const hasMultiple = client.phones.length > 1;
  return (
    <Link
      to="/app/clients/$id"
      params={{ id: client.id }}
      search={{ q: "", page: 1, sort: "recent", kind: "all" }}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {client.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{client.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span dir="ltr" className="inline-flex items-center gap-1 truncate">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {formatPhone(client.phones[0])}
            </span>
            {hasMultiple && <span>+{client.phones.length - 1}</span>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {KIND_META.filter((meta) => client.counts[meta.key] > 0).map((meta) => (
          <Badge key={meta.key} variant={meta.variant}>
            {groupLabel(meta.labelKey)} {client.counts[meta.key]}
          </Badge>
        ))}
      </div>
    </Link>
  );
}

export default ClientsPage;
