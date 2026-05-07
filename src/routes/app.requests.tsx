import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type RequestListItem, type RequestDetails } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/requests")({
  component: RequestsPage,
});

function RequestsPage() {
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
    enabled: !!selectedRequest?.id && !selectedRequest?.requestDate, // Only fetch if we don't have full details
  });

  const requestDetail = selectedRequest
    ? {
        ...selectedRequest,
        ...(detailQuery.data && { ...detailQuery.data }),
      }
    : null;

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

  const totalPages = Math.ceil((requests.data?.total ?? 0) / pageSize);

  return (
    <div>
      <PageHeader title={t("nav.requests")} />

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
        rows={requests.data?.items ?? []}
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
            {Math.min(page * pageSize, requests.data?.total ?? 0)} {t("common.of", { defaultValue: "of" })} {requests.data?.total}
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
