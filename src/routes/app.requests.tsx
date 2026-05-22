import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, resolveApiAssetUrl, type RequestListItem, type RequestDetails, type RequestPropertySuggestion } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { BadgeDollarSign, Building2, MapPin, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { localizePropertyType } from "@/lib/property-types";

export const Route = createFileRoute("/app/requests")({
  component: () => <RequestsPage filterMode="buysell" />,
});

export function RequestsPage({ filterMode }: { filterMode?: "buysell" | "rental" }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [employee, setEmployee] = useState<string>("");
  const [requestType, setRequestType] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedRequest, setSelectedRequest] = useState<RequestDetails | null>(null);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    fullName: "",
    mobileNumber: "",
    requestType: "Rental",
    requestDate: new Date().toISOString().split("T")[0],
    status: "New",
    employee: "",
    nationality: "",
    profession: "",
    bedroomCount: "",
    maxBudget: "",
    paymentType: "",
    location: "",
    via: "",
    notes: "",
  });

  const requests = useQuery({
    queryKey: ["requests", { q, status, employee, requestType, fromDate, toDate, page, pageSize, sortBy, sortDir }],
    queryFn: () =>
      api<{
        total: number;
        page: number;
        pageSize: number;
        items: RequestListItem[];
      }>("/api/requests", {
        query: {
          q: q || undefined,
          status: status !== "all" ? status : undefined,
          employee: employee || undefined,
          requestType: requestType || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page,
          pageSize,
          sortBy: sortBy || undefined,
          sortDir: sortDir || undefined,
        },
      }),
  });

  const detailQuery = useQuery({
    queryKey: ["request", selectedRequest?.id],
    queryFn: () => api<RequestDetails>(`/api/requests/${selectedRequest?.id}`),
    enabled: !!selectedRequest?.id,
  });

  const requestDetail = selectedRequest
    ? {
        ...selectedRequest,
        ...(detailQuery.data && { ...detailQuery.data }),
      }
    : null;

  const requestId = requestDetail?.id ?? selectedRequest?.id;
  const suggestionsQuery = useQuery({
    queryKey: ["request-property-suggestions", requestId],
    queryFn: () => api<RequestPropertySuggestion[]>(`/api/requests/${requestId}/property-suggestions`),
    enabled: !!requestId && !!requestDetail,
  });

  const handleReset = () => {
    setQ("");
    setStatus("all");
    setEmployee("");
    setRequestType("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const handleCreateRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!newRequest.fullName.trim() || !newRequest.mobileNumber.trim() || !newRequest.requestType.trim()) {
      toast.error(t("common.requiredFieldsMissing") || "Please fill in all required fields");
      return;
    }

    setSubmittingRequest(true);
    try {
      await api("/api/requests", {
        method: "POST",
        body: {
          fullName: newRequest.fullName,
          mobileNumber: newRequest.mobileNumber,
          requestType: newRequest.requestType,
          requestDate: newRequest.requestDate ? new Date(newRequest.requestDate) : undefined,
          status: newRequest.status || undefined,
          employee: newRequest.employee || undefined,
          nationality: newRequest.nationality || undefined,
          profession: newRequest.profession || undefined,
          bedroomCount: newRequest.bedroomCount ? parseInt(newRequest.bedroomCount) : undefined,
          maxBudget: newRequest.maxBudget ? parseFloat(newRequest.maxBudget) : undefined,
          paymentType: newRequest.paymentType || undefined,
          location: newRequest.location || undefined,
          via: newRequest.via || undefined,
          notes: newRequest.notes || undefined,
        },
      });

      toast.success(t("common.recordCreated") || "Request created successfully");
      setShowNewRequestDialog(false);
      setNewRequest({
        fullName: "",
        mobileNumber: "",
        requestType: "Rental",
        requestDate: new Date().toISOString().split("T")[0],
        status: "New",
        employee: "",
        nationality: "",
        profession: "",
        bedroomCount: "",
        maxBudget: "",
        paymentType: "",
        location: "",
        via: "",
        notes: "",
      });
      
      // Refetch requests
      qc.invalidateQueries({ queryKey: ["requests"] });
    } catch (error) {
      toast.error(t("common.error") || "Failed to create request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const columns: Column<RequestListItem>[] = [
    {
      key: "fullName",
      header: t("common.fullName"),
      cell: (r) => <span className="font-medium">{r.fullName}</span>,
    },
    {
      key: "requestDate",
      header: t("common.requestDate"),
      cell: (r) => (r.requestDate ? formatDate(r.requestDate) : t("common.notProvided")),
    },
    {
      key: "requestType",
      header: t("common.requestType"),
      cell: (r) => t(`requestType.${r.requestType}`, { defaultValue: r.requestType }),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (r) => {
        const statusKey = `requestStatus.${r.status || "New"}`;
        return t(statusKey);
      },
    },
    {
      key: "employee",
      header: t("common.employee"),
      cell: (r) => r.employee || t("common.notProvided"),
    },
    {
      key: "location",
      header: t("common.location"),
      cell: (r) => r.location || t("common.notProvided"),
    },
    {
      key: "created",
      header: t("common.createdAt"),
      cell: (r) => formatDate(r.createdAt),
    },
  ];

  if (!auth.hasRole("Admin") && !auth.user?.screenPermissions?.includes("/app/requests")) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.noScreenAccess")}
      </div>
    );
  }

  // If filterMode is set we filter client-side (server doesn't support multi-type filter)
  const allItems = requests.data?.items ?? [];
  const filteredAll = filterMode
    ? allItems.filter((it) => {
        if (filterMode === "rental") return it.requestType === "Rental";
        if (filterMode === "buysell") return it.requestType === "Purchase" || it.requestType === "Sell";
        return true;
      })
    : allItems;

  const totalPages = Math.ceil((filteredAll.length ?? 0) / pageSize) || 1;
  const pagedItems = filteredAll.slice((page - 1) * pageSize, page * pageSize);

  const title = filterMode === "rental" ? t("nav.rentalRequests") : filterMode === "buysell" ? t("nav.buysellRequests") : t("nav.requests");

  return (
    <div>
      <PageHeader title={title} />

      {/* Filters */}
      <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="q" className="text-xs font-medium">
              {t("common.search")}
            </Label>
            <Input
              id="q"
              placeholder={t("common.fullName")}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="status" className="text-xs font-medium">
              {t("common.status")}
            </Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger id="status" className="mt-1">
                <SelectValue placeholder={t("common.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="New">{t("requestStatus.New")}</SelectItem>
                <SelectItem value="In Progress">{t("requestStatus.In Progress")}</SelectItem>
                <SelectItem value="Completed">{t("requestStatus.Completed")}</SelectItem>
                <SelectItem value="Cancelled">{t("requestStatus.Cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="requestType" className="text-xs font-medium">
              {t("common.requestType")}
            </Label>
            <Input
              id="requestType"
              placeholder={t("common.requestType")}
              value={requestType}
              onChange={(e) => {
                setRequestType(e.target.value);
                setPage(1);
              }}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="fromDate" className="text-xs font-medium">
              {t("common.startDate")}
            </Label>
            <Input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="toDate" className="text-xs font-medium">
              {t("common.endDate")}
            </Label>
            <Input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="w-fit"
          >
            {t("common.filter")} {(q || status !== "all" || employee || requestType || fromDate || toDate) && <X className="ms-1 h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowNewRequestDialog(true)}
            className="w-fit"
          >
            <Plus className="me-1 h-4 w-4" />
            {t("common.add")} {t("nav.requests")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={pagedItems}
        loading={requests.isLoading}
        error={requests.error}
        rowKey={(r) => r.id}
        onEdit={(r) => setSelectedRequest(r)}
      />

      {/* Pagination */}
      {(requests.data?.total ?? 0) > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("common.skip", { defaultValue: "Showing" })} {(page - 1) * pageSize + 1}
            {" - "}
            {Math.min(page * pageSize, filteredAll.length ?? 0)} {t("common.of", { defaultValue: "of" })} {filteredAll.length}
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
            <div className="flex items-center gap-2">
              <span className="text-sm">{page}</span>
            </div>
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

      {/* Detail Modal */}
      <FormDialog
        open={!!selectedRequest}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedRequest(null);
          }
        }}
        title={t("common.details")}
        size="lg"
        submitting={false}
        onSubmit={(e) => {
          e.preventDefault();
          setSelectedRequest(null);
        }}
        submitLabel={t("common.close")}
      >
        {detailQuery.isLoading && <div className="text-center text-sm text-muted-foreground">{t("common.loading")}</div>}
        {detailQuery.error && (
          <div className="text-center text-sm text-destructive">{t("common.error")}</div>
        )}
        {requestDetail && !detailQuery.isLoading && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailField label={t("common.fullName")} value={requestDetail.fullName} />
              <DetailField label={t("common.mobileNumber")} value={requestDetail.mobileNumber} />
              <DetailField
                label={t("common.requestType")}
                value={t(`requestType.${requestDetail.requestType}`, { defaultValue: requestDetail.requestType })}
              />
              <DetailField
                label={t("common.status")}
                value={requestDetail.status ? t(`requestStatus.${requestDetail.status}`) : t("common.notProvided")}
              />
              <DetailField
                label={t("common.requestDate")}
                value={requestDetail.requestDate ? formatDate(requestDetail.requestDate) : t("common.notProvided")}
              />
              <DetailField
                label={t("common.location")}
                value={requestDetail.location || t("common.notProvided")}
              />
              <DetailField
                label={t("common.nationality")}
                value={requestDetail.nationality || t("common.notProvided")}
              />
              <DetailField
                label={t("common.profession")}
                value={requestDetail.profession || t("common.notProvided")}
              />
              <DetailField
                label={t("common.bedroomCount")}
                value={requestDetail.bedroomCount ? String(requestDetail.bedroomCount) : t("common.notProvided")}
              />
              <DetailField
                label={t("common.maxBudget")}
                value={
                  requestDetail.maxBudget
                    ? `${requestDetail.maxBudget.toLocaleString()}`
                    : t("common.notProvided")
                }
              />
              <DetailField
                label={t("common.paymentType")}
                value={requestDetail.paymentType || t("common.notProvided")}
              />
              <DetailField
                label={t("common.employee")}
                value={requestDetail.employee || t("common.notProvided")}
              />
              <DetailField label={t("common.via")} value={requestDetail.via || t("common.notProvided")} />
              <DetailField
                label={t("common.createdAt")}
                value={formatDate(requestDetail.createdAt)}
              />
            </div>
            {requestDetail.notes && (
              <div>
                <Label className="mb-2">{t("common.notes")}</Label>
                <div className="rounded border border-border bg-muted p-3 text-sm">
                  {requestDetail.notes}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{t("common.suggestions", { defaultValue: "Suggested properties" })}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("common.autoMatched", { defaultValue: "Top matches for this request" })}
                  </p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  {suggestionsQuery.data?.length ?? 0}
                </Badge>
              </div>

              {suggestionsQuery.isLoading ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("common.loading")}
                </div>
              ) : suggestionsQuery.error ? (
                <div className="rounded-lg border border-dashed border-destructive/40 px-4 py-6 text-center text-sm text-destructive">
                  {t("common.error")}
                </div>
              ) : (suggestionsQuery.data?.length ?? 0) === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("common.noData", { defaultValue: "No property suggestions found." })}
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestionsQuery.data?.map((property) => (
                    <div key={property.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                      <div className="flex gap-3 p-3">
                        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          {property.primaryImageUrl ? (
                            <img
                              src={resolveApiAssetUrl(property.primaryImageUrl)}
                              alt={property.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                              <Building2 className="h-5 w-5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                                  <Sparkles className="h-3 w-3" />
                                  {t("common.match", { defaultValue: "Match" })} {property.score}
                                </span>
                              </div>
                              <div className="mt-1 truncate font-medium">{property.name}</div>
                              <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{property.address}</span>
                              </div>
                            </div>

                            <Badge variant="outline">{property.listingType}</Badge>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{localizePropertyType(t, property.type)}</span>
                            {property.region && <span>{property.region}</span>}
                            {property.city && <span>{property.city}</span>}
                            {property.district && <span>{property.district}</span>}
                            {(property.rentPrice ?? property.salePrice) != null && (
                              <span className="inline-flex items-center gap-1">
                                <BadgeDollarSign className="h-3.5 w-3.5" />
                                {(property.rentPrice ?? property.salePrice)!.toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {property.reasons.slice(0, 3).map((r, i) => {
                              const args = r.args ? { ...r.args } : undefined;
                              if (args && args.listingType) {
                                args.listingType = t(`requestType.${args.listingType}`, { defaultValue: args.listingType });
                              }
                              return (
                                <Badge key={`${r.key}-${i}`} variant="outline" className="text-[11px]">
                                  {t(`suggestions.reasons.${r.key}`, args || {})}
                                </Badge>
                              );
                            })}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link
                                to="/app/properties/$id"
                                params={{ id: String(property.id) }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {t("common.open")}
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </FormDialog>

      {/* Create Request Dialog */}
      <FormDialog
        open={showNewRequestDialog}
        onOpenChange={setShowNewRequestDialog}
        title={t("common.createRequest") || "Add Request"}
        submitting={submittingRequest}
        onSubmit={handleCreateRequest}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="fullName" className="text-xs font-medium">
              {t("common.fullName")} *
            </Label>
            <Input
              id="fullName"
              required
              value={newRequest.fullName}
              onChange={(e) => setNewRequest({ ...newRequest, fullName: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="mobileNumber" className="text-xs font-medium">
              {t("common.mobileNumber")} *
            </Label>
            <Input
              id="mobileNumber"
              required
              value={newRequest.mobileNumber}
              onChange={(e) => setNewRequest({ ...newRequest, mobileNumber: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="requestType" className="text-xs font-medium">
              {t("common.requestType")} *
            </Label>
            <Select
              value={newRequest.requestType}
              onValueChange={(v) => setNewRequest({ ...newRequest, requestType: v })}
            >
              <SelectTrigger id="requestType" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rental">{t("requestType.Rental") || "Rental"}</SelectItem>
                <SelectItem value="Purchase">{t("requestType.Purchase") || "Purchase"}</SelectItem>
                <SelectItem value="Sell">{t("requestType.Sell") || "Sell"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="requestDate" className="text-xs font-medium">
              {t("common.requestDate")}
            </Label>
            <Input
              id="requestDate"
              type="date"
              value={newRequest.requestDate}
              onChange={(e) => setNewRequest({ ...newRequest, requestDate: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="status" className="text-xs font-medium">
              {t("common.status")}
            </Label>
            <Select
              value={newRequest.status}
              onValueChange={(v) => setNewRequest({ ...newRequest, status: v })}
            >
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="New">{t("requestStatus.New")}</SelectItem>
                <SelectItem value="In Progress">{t("requestStatus.In Progress")}</SelectItem>
                <SelectItem value="Completed">{t("requestStatus.Completed")}</SelectItem>
                <SelectItem value="Cancelled">{t("requestStatus.Cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="employee" className="text-xs font-medium">
              {t("common.employee")}
            </Label>
            <Input
              id="employee"
              value={newRequest.employee}
              onChange={(e) => setNewRequest({ ...newRequest, employee: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="nationality" className="text-xs font-medium">
              {t("common.nationality")}
            </Label>
            <Input
              id="nationality"
              value={newRequest.nationality}
              onChange={(e) => setNewRequest({ ...newRequest, nationality: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="profession" className="text-xs font-medium">
              {t("common.profession")}
            </Label>
            <Input
              id="profession"
              value={newRequest.profession}
              onChange={(e) => setNewRequest({ ...newRequest, profession: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bedroomCount" className="text-xs font-medium">
              {t("common.bedroomCount")}
            </Label>
            <Input
              id="bedroomCount"
              type="number"
              value={newRequest.bedroomCount}
              onChange={(e) => setNewRequest({ ...newRequest, bedroomCount: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="maxBudget" className="text-xs font-medium">
              {t("common.maxBudget")}
            </Label>
            <Input
              id="maxBudget"
              type="number"
              step="0.01"
              value={newRequest.maxBudget}
              onChange={(e) => setNewRequest({ ...newRequest, maxBudget: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="paymentType" className="text-xs font-medium">
              {t("common.paymentType")}
            </Label>
            <Input
              id="paymentType"
              value={newRequest.paymentType}
              onChange={(e) => setNewRequest({ ...newRequest, paymentType: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="location" className="text-xs font-medium">
              {t("common.location")}
            </Label>
            <Input
              id="location"
              value={newRequest.location}
              onChange={(e) => setNewRequest({ ...newRequest, location: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="via" className="text-xs font-medium">
              {t("common.via")}
            </Label>
            <Input
              id="via"
              value={newRequest.via}
              onChange={(e) => setNewRequest({ ...newRequest, via: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="notes" className="text-xs font-medium">
              {t("common.notes")}
            </Label>
            <textarea
              id="notes"
              value={newRequest.notes}
              onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
