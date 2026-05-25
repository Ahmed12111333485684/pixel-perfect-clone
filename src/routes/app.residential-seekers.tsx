import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, resolveApiAssetUrl, type ResidentialSeeker, type RequestPropertySuggestion, fetchPartners } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PROPERTY_TYPES, localizePropertyType } from "@/lib/property-types";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BadgeDollarSign, Building2, MapPin, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/residential-seekers")({
  component: ResidentialSeekersPage,
});

interface ResidentialSeekersSearchResult {
  total: number;
  page: number;
  pageSize: number;
  items: ResidentialSeeker[];
}

const STATUS_ACTIVE = "نشط";
const STATUS_ENDED = "انتهى";

const RESIDENTIAL_FIELDS = [
  "serialNumber",
  "requestDate",
  "status",
  "employee",
  "receiver",
  "sourceChannel",
  "listingType",
  "propertyType",
  "fullName",
  "mobile",
  "nationality",
  "profession",
  "familyCount",
  "requestDescription",
  "maxBudget",
  "paymentType",
  "preferredLocation",
  "notes",
] as const;

type ResidentialFieldKey = (typeof RESIDENTIAL_FIELDS)[number];

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim();
}

function readFieldValue(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function buildResidentialPayload(fd: FormData, original?: ResidentialSeeker | null) {
  const payload: Record<string, string> = {};

  RESIDENTIAL_FIELDS.forEach((key) => {
    const value = readFieldValue(fd, key);
    if (!original || value !== normalizeValue(original[key as ResidentialFieldKey] as string | null | undefined)) {
      payload[key] = value;
    }
  });

  return payload;
}

function truncateText(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

function ResidentialSeekersPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy] = useState<string>("createdAt");
  const [sortDir] = useState<"asc" | "desc">("desc");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<ResidentialSeeker | null>(null);
  const [deleting, setDeleting] = useState<ResidentialSeeker | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const hasAccess = auth.hasRole("Admin")
    || auth.isPartner
    || auth.user?.screenPermissions.includes("/app/residential-seekers");
  const canManage = auth.isStaff || auth.isPartner;

  const seekers = useQuery({
    queryKey: ["residential-seekers", { q, status, page, pageSize, sortBy, sortDir }],
    queryFn: () => api<ResidentialSeekersSearchResult>("/api/residential-seekers", {
      query: {
        q: q || undefined,
        status: status !== "all" ? status : undefined,
        page,
        pageSize,
        sortBy: sortBy || undefined,
        sortDir: sortDir || undefined,
      },
    }),
    enabled: hasAccess,
  });

  const suggestionsQuery = useQuery({
    queryKey: ["residential-seeker-suggestions", selected?.id],
    queryFn: () => api<RequestPropertySuggestion[]>(`/api/residential-seekers/${selected?.id}/property-suggestions`),
    enabled: !!selected?.id,
  });

  const handleReset = () => {
    setQ("");
    setStatus("all");
    setPage(1);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildResidentialPayload(fd);
      await api<ResidentialSeeker>("/api/residential-seekers", { method: "POST", body: payload });
      toast.success(t("common.created"));
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["residential-seekers"] });
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildResidentialPayload(fd, selected);
      if (Object.keys(payload).length === 0) {
        setSelected(null);
        return;
      }
      await api<ResidentialSeeker>(`/api/residential-seekers/${selected.id}`, { method: "PUT", body: payload });
      toast.success(t("common.updated"));
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["residential-seekers"] });
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingRecord(true);
    try {
      await api(`/api/residential-seekers/${deleting.id}`, { method: "DELETE" });
      toast.success(t("common.deleted"));
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["residential-seekers"] });
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setDeletingRecord(false);
    }
  };

  const statusTone = (value?: string | null) => {
    const normalized = normalizeValue(value);
    if (normalized === STATUS_ENDED) return "neutral" as const;
    if (normalized === STATUS_ACTIVE) return "success" as const;
    return "warning" as const;
  };

  const statusLabel = (value?: string | null) => {
    const normalized = normalizeValue(value);
    if (!normalized) return t("common.notProvided");
    if (normalized === STATUS_ACTIVE) return t("residentialSeekers.statusActive");
    if (normalized === STATUS_ENDED) return t("residentialSeekers.statusEnded");
    return value ?? t("common.notProvided");
  };

  const columns: Column<ResidentialSeeker>[] = [
    {
      key: "serialNumber",
      header: t("residentialSeekers.serialNumber"),
      cell: (r) => r.serialNumber || t("common.notProvided"),
    },
    {
      key: "requestDate",
      header: t("residentialSeekers.requestDate"),
      cell: (r) => r.requestDate || t("common.notProvided"),
    },
    {
      key: "status",
      header: t("residentialSeekers.status"),
      cell: (r) => (
        <StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge>
      ),
    },
    {
      key: "fullName",
      header: t("residentialSeekers.fullName"),
      cell: (r) => <span className="font-medium">{r.fullName || t("common.notProvided")}</span>,
    },
    {
      key: "mobile",
      header: t("common.phone"),
      cell: (r) => r.mobile || t("common.notProvided"),
    },
    {
      key: "nationality",
      header: t("residentialSeekers.nationality"),
      cell: (r) => r.nationality || t("common.notProvided"),
    },
    {
      key: "requestDescription",
      header: t("residentialSeekers.requestDescription"),
      cell: (r) => r.requestDescription
        ? truncateText(r.requestDescription, 60)
        : t("common.notProvided"),
    },
    {
      key: "maxBudget",
      header: t("residentialSeekers.maxBudget"),
      cell: (r) => r.maxBudget || t("common.notProvided"),
    },
    {
      key: "paymentType",
      header: t("residentialSeekers.paymentType"),
      cell: (r) => r.paymentType || t("common.notProvided"),
    },
    {
      key: "listingType",
      header: t("residentialSeekers.listingType"),
      cell: (r) => r.listingType ? t(`listingType.${r.listingType}`, { defaultValue: r.listingType }) : t("common.notProvided"),
    },
    {
      key: "propertyType",
      header: t("residentialSeekers.propertyType"),
      cell: (r) => r.propertyType ? localizePropertyType(t, r.propertyType) : t("common.notProvided"),
    },
    {
      key: "preferredLocation",
      header: t("residentialSeekers.preferredLocation"),
      cell: (r) => r.preferredLocation || t("common.notProvided"),
    },
    {
      key: "employee",
      header: t("common.employee"),
      cell: (r) => r.employee || t("common.notProvided"),
    },
  ];

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.noScreenAccess")}
      </div>
    );
  }

  const totalPages = Math.ceil((seekers.data?.total ?? 0) / pageSize);

  return (
    <div>
      <PageHeader
        title={t("residentialSeekers.pageTitle")}
        subtitle={t("residentialSeekers.pageSubtitle")}
        actions={canManage ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="me-1 h-4 w-4" />
            {t("common.add")}
          </Button>
        ) : undefined}
      />

      <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="q" className="text-xs font-medium">
              {t("common.search")}
            </Label>
            <Input
              id="q"
              placeholder={t("residentialSeekers.fullName")}
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
              {t("residentialSeekers.status")}
            </Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger id="status" className="mt-1">
                <SelectValue placeholder={t("common.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value={STATUS_ACTIVE}>{t("residentialSeekers.statusActive")}</SelectItem>
                <SelectItem value={STATUS_ENDED}>{t("residentialSeekers.statusEnded")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleReset} className="w-fit">
            {t("common.filter")}
            {(q || status !== "all") && <X className="ms-1 h-3 w-3" />}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={seekers.data?.items ?? []}
        loading={seekers.isLoading}
        error={seekers.error}
        rowKey={(r) => r.id}
        onEdit={canManage ? (row) => setSelected(row) : undefined}
        onDelete={canManage ? (row) => setDeleting(row) : undefined}
        onRowClick={(row) => setSelected(row)}
      />

      {(seekers.data?.total ?? 0) > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("common.skip", { defaultValue: "Showing" })} {(page - 1) * pageSize + 1}
            {" - "}
            {Math.min(page * pageSize, seekers.data?.total ?? 0)} {t("common.of", { defaultValue: "of" })} {seekers.data?.total}
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

      <ResidentialSeekerDialog
        open={creating}
        onOpenChange={setCreating}
        seeker={null}
        suggestions={[]}
        suggestionsLoading={false}
        suggestionsError={null}
        readOnly={!canManage}
        submitting={submitting}
        title={`${t("common.add")} ${t("nav.residentialSeekers")}`}
        submitLabel={t("common.create")}
        onSubmit={handleCreate}
      />

      <ResidentialSeekerDialog
        open={!!selected}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
        seeker={selected}
        suggestions={suggestionsQuery.data ?? []}
        suggestionsLoading={suggestionsQuery.isLoading}
        suggestionsError={suggestionsQuery.error}
        readOnly={!canManage}
        submitting={submitting}
        title={canManage ? t("common.edit") : t("common.details")}
        submitLabel={canManage ? t("common.save") : t("common.close")}
        onSubmit={canManage ? handleUpdate : (e) => {
          e.preventDefault();
          setSelected(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(value) => {
          if (!value) setDeleting(null);
        }}
        title={t("common.delete")}
        description={deleting?.fullName ?? t("residentialSeekers.pageTitle")}
        confirmLabel={t("common.delete")}
        destructive
        loading={deletingRecord}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function ResidentialSeekerDialog({
  open,
  onOpenChange,
  seeker,
  suggestions = [],
  suggestionsLoading = false,
  suggestionsError = null,
  readOnly,
  submitting,
  title,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  seeker: ResidentialSeeker | null;
  suggestions: RequestPropertySuggestion[];
  suggestionsLoading: boolean;
  suggestionsError: unknown;
  readOnly: boolean;
  submitting?: boolean;
  title: string;
  submitLabel: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [listingType, setListingType] = useState(seeker?.listingType ?? "Rental");
  const maxBudgetLabel = listingType === "Rental"
    ? t("residentialSeekers.maxRentalBudget")
    : t("residentialSeekers.maxBudget");

  return (
    <FormDialog
      key={`${seeker?.id ?? "new"}-${open}`}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      submitLabel={submitLabel}
      submitting={submitting}
      size="lg"
      onSubmit={onSubmit}
    >
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="serialNumber" label={t("residentialSeekers.serialNumber")} defaultValue={seeker?.serialNumber} readOnly={readOnly} />
          <TextField id="requestDate" label={t("residentialSeekers.requestDate")} defaultValue={seeker?.requestDate} readOnly={readOnly} />
          <TextField id="status" label={t("residentialSeekers.status")} defaultValue={seeker?.status} readOnly={readOnly} />
          <TextField id="employee" label={t("common.employee")} defaultValue={seeker?.employee} readOnly={readOnly} />
          <TextField id="receiver" label={t("residentialSeekers.receiver")} defaultValue={seeker?.receiver} readOnly={readOnly} />
          {readOnly ? (
            <TextField id="sourceChannel" label={t("residentialSeekers.sourceChannel")} defaultValue={seeker?.sourceChannel} readOnly={readOnly} />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="sourceChannel" className="text-xs font-medium">
                {t("residentialSeekers.sourceChannel")}
              </Label>
              <PartnersSelect defaultValue={seeker?.sourceChannel} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="fullName" label={t("residentialSeekers.fullName")} defaultValue={seeker?.fullName} readOnly={readOnly} />
          <TextField id="mobile" label={t("common.mobileNumber")} defaultValue={seeker?.mobile} readOnly={readOnly} />
          <TextField id="nationality" label={t("residentialSeekers.nationality")} defaultValue={seeker?.nationality} readOnly={readOnly} />
          <TextField id="profession" label={t("residentialSeekers.profession")} defaultValue={seeker?.profession} readOnly={readOnly} />
          <TextField id="familyCount" label={t("residentialSeekers.familyCount")} defaultValue={seeker?.familyCount} readOnly={readOnly} />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="listingType"
            label={t("residentialSeekers.listingType")}
            defaultValue={seeker?.listingType ?? "Rental"}
            readOnly={readOnly}
            onValueChange={setListingType}
            options={[
              { value: "Rental", label: t("listingType.Rental") },
              { value: "Sale", label: t("listingType.Sale") },
            ]}
          />
          <SelectField
            id="propertyType"
            label={t("residentialSeekers.propertyType")}
            defaultValue={seeker?.propertyType ?? PROPERTY_TYPES[0]}
            readOnly={readOnly}
            options={PROPERTY_TYPES.map((type) => ({ value: type, label: localizePropertyType(t, type) }))}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextareaField
            id="requestDescription"
            label={t("residentialSeekers.requestDescription")}
            defaultValue={seeker?.requestDescription}
            readOnly={readOnly}
            className="sm:col-span-2"
          />
          <TextField id="maxBudget" label={maxBudgetLabel} defaultValue={seeker?.maxBudget} readOnly={readOnly} />
          <TextField id="paymentType" label={t("residentialSeekers.paymentType")} defaultValue={seeker?.paymentType} readOnly={readOnly} />
          <TextField id="preferredLocation" label={t("residentialSeekers.preferredLocation")} defaultValue={seeker?.preferredLocation} readOnly={readOnly} />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <TextareaField id="notes" label={t("common.notes")} defaultValue={seeker?.notes} readOnly={readOnly} />
      </div>

      {seeker && (
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{t("common.suggestions", { defaultValue: "Suggested properties" })}</p>
              <p className="text-xs text-muted-foreground">
                {t("common.autoMatched", { defaultValue: "Top matches for this request" })}
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              {suggestions.length}
            </Badge>
          </div>

          {suggestionsLoading ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : suggestionsError ? (
            <div className="rounded-lg border border-dashed border-destructive/40 px-4 py-6 text-center text-sm text-destructive">
              {t("common.error")}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {t("common.noData", { defaultValue: "No property suggestions found." })}
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((property) => (
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

                        <Badge variant="outline">{t(`listingType.${property.listingType}`, { defaultValue: property.listingType })}</Badge>
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
                        {property.reasons.slice(0, 3).map((reason, index) => {
                          const args = reason.args ? { ...reason.args } : undefined;
                          if (args && args.listingType) {
                            args.listingType = t(`requestType.${args.listingType}`, { defaultValue: args.listingType });
                          }
                          if (args && args.propertyType) {
                            args.propertyType = localizePropertyType(t, args.propertyType);
                          }

                          return (
                            <Badge key={`${reason.key}-${index}`} variant="outline" className="text-[11px]">
                              {t(`suggestions.reasons.${reason.key}`, args || {})}
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
      )}
    </FormDialog>
  );
}

function TextField({
  id,
  label,
  defaultValue,
  readOnly,
}: {
  id: string;
  label: string;
  defaultValue?: string | null;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        defaultValue={defaultValue ?? ""}
        readOnly={readOnly}
        disabled={readOnly}
        className="mt-1"
      />
    </div>
  );
}

function TextareaField({
  id,
  label,
  defaultValue,
  readOnly,
  className,
}: {
  id: string;
  label: string;
  defaultValue?: string | null;
  readOnly: boolean;
  className?: string;
}) {
  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <Textarea
        id={id}
        name={id}
        defaultValue={defaultValue ?? ""}
        readOnly={readOnly}
        disabled={readOnly}
        rows={3}
        className="mt-1"
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  defaultValue,
  readOnly,
  options,
  onValueChange,
}: {
  id: string;
  label: string;
  defaultValue: string;
  readOnly: boolean;
  options: Array<{ value: string; label: string }>;
  onValueChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <Select name={id} defaultValue={defaultValue} disabled={readOnly} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PartnersSelect({ defaultValue }: { defaultValue?: string | null }) {
  const { data } = useQuery({ queryKey: ["partners"], queryFn: fetchPartners });
  const partners = data ?? [];

  return (
    <select
      id="sourceChannel"
      name="sourceChannel"
      defaultValue={defaultValue ?? ""}
      className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none"
    >
      <option value="">—</option>
      {partners.map((p) => (
        <option key={p.id} value={p.fullName}>{p.fullName}</option>
      ))}
    </select>
  );
}
