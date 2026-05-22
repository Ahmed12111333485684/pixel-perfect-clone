import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, fetchPartners, type CommercialListing, type Partner } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/commercial-listings")({
  component: CommercialListingsPage,
});

interface CommercialListingSearchResult {
  total: number;
  page: number;
  pageSize: number;
  items: CommercialListing[];
}

const PUBLISHED_VALUE = "تم";
const STATUS_AVAILABLE = "متاح";
const STATUS_RENTED = "تم التأجير";

const COMMERCIAL_FIELDS = [
  "serialNumber",
  "contactDate",
  "propertyStatus",
  "brokerageContract",
  "licenseNumber",
  "contractExpiry",
  "adNumber",
  "employee",
  "broker",
  "ownerName",
  "mobile1",
  "mobile2",
  "availableUnits",
  "deedNumber",
  "propertyType",
  "roomsCount",
  "buildingAge",
  "hasElevator",
  "otherDetails",
  "rentAmount",
  "paymentType",
  "location",
  "coordinates",
  "hasKey",
  "notes",
] as const;

type CommercialFieldKey = (typeof COMMERCIAL_FIELDS)[number];

type PublishingChannel = {
  key: keyof CommercialListing;
  labelKey: string;
};

const PUBLISHING_CHANNELS: PublishingChannel[] = [
  { key: "publishedTahmid", labelKey: "commercialListings.channels.tahmid" },
  { key: "publishedBoard", labelKey: "commercialListings.channels.board" },
  { key: "publishedDesigns", labelKey: "commercialListings.channels.designs" },
  { key: "publishedHaraj", labelKey: "commercialListings.channels.haraj" },
  { key: "publishedDeal", labelKey: "commercialListings.channels.deal" },
  { key: "publishedAqar", labelKey: "commercialListings.channels.aqar" },
  { key: "publishedBayut", labelKey: "commercialListings.channels.bayut" },
  { key: "publishedDhaki", labelKey: "commercialListings.channels.dhaki" },
  { key: "publishedWhatsapp", labelKey: "commercialListings.channels.whatsapp" },
  { key: "publishedTwitter", labelKey: "commercialListings.channels.twitter" },
  { key: "publishedWhatsappGroup", labelKey: "commercialListings.channels.whatsappGroup" },
  { key: "publishedWhatsappChannel", labelKey: "commercialListings.channels.whatsappChannel" },
  { key: "publishedSnapchat", labelKey: "commercialListings.channels.snapchat" },
  { key: "publishedX", labelKey: "commercialListings.channels.x" },
  { key: "publishedInstagram", labelKey: "commercialListings.channels.instagram" },
  { key: "publishedTiktok", labelKey: "commercialListings.channels.tiktok" },
];

type PublishingState = Record<string, boolean>;

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim();
}

function isPublished(value: string | null | undefined) {
  return normalizeValue(value) === PUBLISHED_VALUE;
}

function buildPublishingState(listing?: CommercialListing | null): PublishingState {
  return PUBLISHING_CHANNELS.reduce<PublishingState>((acc, channel) => {
    acc[channel.key] = isPublished(listing?.[channel.key] as string | null | undefined);
    return acc;
  }, {});
}

function readFieldValue(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function buildCommercialPayload(
  fd: FormData,
  publishing: PublishingState,
  original?: CommercialListing | null,
) {
  const payload: Record<string, string> = {};

  COMMERCIAL_FIELDS.forEach((key) => {
    const value = readFieldValue(fd, key);
    if (!original || value !== normalizeValue(original[key as CommercialFieldKey] as string | null | undefined)) {
      payload[key] = value;
    }
  });

  PUBLISHING_CHANNELS.forEach((channel) => {
    const value = publishing[channel.key] ? PUBLISHED_VALUE : "";
    if (!original || value !== normalizeValue(original?.[channel.key] as string | null | undefined)) {
      payload[channel.key] = value;
    }
  });

  return payload;
}

function CommercialListingsPage() {
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
  const [selected, setSelected] = useState<CommercialListing | null>(null);
  const [deleting, setDeleting] = useState<CommercialListing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const hasAccess = auth.hasRole("Admin")
    || auth.isPartner
    || auth.user?.screenPermissions.includes("/app/commercial-listings");
  const canManage = auth.isStaff || auth.isPartner;

  const listings = useQuery({
    queryKey: ["commercial-listings", { q, status, page, pageSize, sortBy, sortDir }],
    queryFn: () => api<CommercialListingSearchResult>("/api/commercial-listings", {
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

  const partners = useQuery({
    queryKey: ["partners", "lookup"],
    queryFn: fetchPartners,
    enabled: hasAccess,
  });

  const handleReset = () => {
    setQ("");
    setStatus("all");
    setPage(1);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>, publishing: PublishingState) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildCommercialPayload(fd, publishing);
      await api<CommercialListing>("/api/commercial-listings", { method: "POST", body: payload });
      toast.success(t("common.created"));
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["commercial-listings"] });
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>, publishing: PublishingState) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildCommercialPayload(fd, publishing, selected);
      if (Object.keys(payload).length === 0) {
        setSelected(null);
        return;
      }
      await api<CommercialListing>(`/api/commercial-listings/${selected.id}`, { method: "PUT", body: payload });
      toast.success(t("common.updated"));
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["commercial-listings"] });
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
      await api(`/api/commercial-listings/${deleting.id}`, { method: "DELETE" });
      toast.success(t("common.deleted"));
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["commercial-listings"] });
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setDeletingRecord(false);
    }
  };

  const statusTone = (value?: string | null) => {
    const normalized = normalizeValue(value);
    if (normalized === STATUS_RENTED) return "success" as const;
    if (normalized === STATUS_AVAILABLE) return "info" as const;
    return "neutral" as const;
  };

  const statusLabel = (value?: string | null) => {
    const normalized = normalizeValue(value);
    if (!normalized) return t("common.notProvided");
    if (normalized === STATUS_AVAILABLE) return t("commercialListings.statusAvailable");
    if (normalized === STATUS_RENTED) return t("commercialListings.statusRented");
    return value ?? t("common.notProvided");
  };

  const columns: Column<CommercialListing>[] = [
    {
      key: "serialNumber",
      header: t("commercialListings.serialNumber"),
      cell: (r) => r.serialNumber || t("common.notProvided"),
    },
    {
      key: "contactDate",
      header: t("commercialListings.contactDate"),
      cell: (r) => r.contactDate || t("common.notProvided"),
    },
    {
      key: "propertyStatus",
      header: t("commercialListings.propertyStatus"),
      cell: (r) => (
        <StatusBadge tone={statusTone(r.propertyStatus)}>{statusLabel(r.propertyStatus)}</StatusBadge>
      ),
    },
    {
      key: "ownerName",
      header: t("commercialListings.ownerName"),
      cell: (r) => <span className="font-medium">{r.ownerName || t("common.notProvided")}</span>,
    },
    {
      key: "deedNumber",
      header: t("commercialListings.deedNumber"),
      cell: (r) => (
        r.deedNumber ? <span className="font-mono text-sm">{r.deedNumber}</span> : t("common.notProvided")
      ),
    },
    {
      key: "mobile1",
      header: t("commercialListings.mobile1"),
      cell: (r) => r.mobile1 || t("common.notProvided"),
    },
    {
      key: "propertyType",
      header: t("commercialListings.propertyType"),
      cell: (r) => r.propertyType || t("common.notProvided"),
    },
    {
      key: "rentAmount",
      header: t("commercialListings.rentAmount"),
      cell: (r) => r.rentAmount || t("common.notProvided"),
    },
    {
      key: "paymentType",
      header: t("commercialListings.paymentType"),
      cell: (r) => r.paymentType || t("common.notProvided"),
    },
    {
      key: "location",
      header: t("commercialListings.location"),
      cell: (r) => r.location || t("common.notProvided"),
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

  const totalPages = Math.ceil((listings.data?.total ?? 0) / pageSize);

  return (
    <div>
      <PageHeader
        title={t("commercialListings.pageTitle")}
        subtitle={t("commercialListings.pageSubtitle")}
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
              placeholder={t("commercialListings.ownerName")}
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
              {t("commercialListings.propertyStatus")}
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
                <SelectItem value={STATUS_AVAILABLE}>{t("commercialListings.statusAvailable")}</SelectItem>
                <SelectItem value={STATUS_RENTED}>{t("commercialListings.statusRented")}</SelectItem>
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
        rows={listings.data?.items ?? []}
        loading={listings.isLoading}
        error={listings.error}
        rowKey={(r) => r.id}
        onEdit={canManage ? (row) => setSelected(row) : undefined}
        onDelete={canManage ? (row) => setDeleting(row) : undefined}
        onRowClick={(row) => setSelected(row)}
      />

      {(listings.data?.total ?? 0) > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("common.skip", { defaultValue: "Showing" })} {(page - 1) * pageSize + 1}
            {" - "}
            {Math.min(page * pageSize, listings.data?.total ?? 0)} {t("common.of", { defaultValue: "of" })} {listings.data?.total}
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

      <CommercialListingDialog
        open={creating}
        onOpenChange={setCreating}
        listing={null}
        partners={partners.data ?? []}
        partnersLoading={partners.isLoading}
        readOnly={!canManage}
        submitting={submitting}
        title={`${t("common.add")} ${t("nav.commercialListings")}`}
        submitLabel={t("common.create")}
        onSubmit={handleCreate}
      />

      <CommercialListingDialog
        open={!!selected}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
        listing={selected}
        partners={partners.data ?? []}
        partnersLoading={partners.isLoading}
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
        description={deleting?.ownerName ?? t("commercialListings.pageTitle")}
        confirmLabel={t("common.delete")}
        destructive
        loading={deletingRecord}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function CommercialListingDialog({
  open,
  onOpenChange,
  listing,
  partners,
  partnersLoading,
  readOnly,
  submitting,
  title,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  listing: CommercialListing | null;
  partners: Partner[];
  partnersLoading: boolean;
  readOnly: boolean;
  submitting?: boolean;
  title: string;
  submitLabel: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>, publishing: PublishingState) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [publishing, setPublishing] = useState<PublishingState>(() => buildPublishingState(listing));
  const [broker, setBroker] = useState<string>(listing?.broker ?? "");

  const partnerOptions = partners
    .filter((partner) => partner.fullName.trim().length > 0)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const hasCurrentBrokerInPartners = broker
    ? partnerOptions.some((partner) => partner.fullName === broker)
    : true;

  useEffect(() => {
    if (open) {
      setPublishing(buildPublishingState(listing));
      setBroker(listing?.broker ?? "");
    }
  }, [listing, open]);

  return (
    <FormDialog
      key={`${listing?.id ?? "new"}-${open}`}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      submitLabel={submitLabel}
      submitting={submitting}
      size="lg"
      onSubmit={(e) => onSubmit(e, publishing)}
    >
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="serialNumber" label={t("commercialListings.serialNumber")} defaultValue={listing?.serialNumber} readOnly={readOnly} />
          <TextField id="contactDate" label={t("commercialListings.contactDate")} defaultValue={listing?.contactDate} readOnly={readOnly} />
          <TextField id="propertyStatus" label={t("commercialListings.propertyStatus")} defaultValue={listing?.propertyStatus} readOnly={readOnly} />
          <TextField id="brokerageContract" label={t("commercialListings.brokerageContract")} defaultValue={listing?.brokerageContract} readOnly={readOnly} />
          <TextField id="licenseNumber" label={t("commercialListings.licenseNumber")} defaultValue={listing?.licenseNumber} readOnly={readOnly} />
          <TextField id="contractExpiry" label={t("commercialListings.contractExpiry")} defaultValue={listing?.contractExpiry} readOnly={readOnly} />
          <TextField id="adNumber" label={t("commercialListings.adNumber")} defaultValue={listing?.adNumber} readOnly={readOnly} />
          <TextField id="employee" label={t("common.employee")} defaultValue={listing?.employee} readOnly={readOnly} />
          <div className="space-y-2">
            <Label htmlFor="broker" className="text-xs font-medium">
              {t("commercialListings.broker")}
            </Label>
            <Select value={broker || "none"} onValueChange={(value) => setBroker(value === "none" ? "" : value)} disabled={readOnly}>
              <SelectTrigger id="broker" className="mt-1">
                <SelectValue placeholder={partnersLoading ? "Loading partners..." : "Select partner"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("common.notProvided")}</SelectItem>
                {partnerOptions.map((partner) => (
                  <SelectItem key={partner.id} value={partner.fullName}>
                    {partner.fullName}
                  </SelectItem>
                ))}
                {broker && !hasCurrentBrokerInPartners && (
                  <SelectItem value={broker}>{broker}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <input type="hidden" name="broker" value={broker} />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="ownerName" label={t("commercialListings.ownerName")} defaultValue={listing?.ownerName} readOnly={readOnly} />
          <TextField id="mobile1" label={t("commercialListings.mobile1")} defaultValue={listing?.mobile1} readOnly={readOnly} />
          <TextField id="mobile2" label={t("commercialListings.mobile2")} defaultValue={listing?.mobile2} readOnly={readOnly} />
          <TextField id="availableUnits" label={t("commercialListings.availableUnits")} defaultValue={listing?.availableUnits} readOnly={readOnly} />
          <TextField id="deedNumber" label={t("commercialListings.deedNumber")} defaultValue={listing?.deedNumber} readOnly={readOnly} />
          <TextField id="propertyType" label={t("commercialListings.propertyType")} defaultValue={listing?.propertyType} readOnly={readOnly} />
          <TextField id="roomsCount" label={t("commercialListings.roomsCount")} defaultValue={listing?.roomsCount} readOnly={readOnly} />
          <TextField id="buildingAge" label={t("commercialListings.buildingAge")} defaultValue={listing?.buildingAge} readOnly={readOnly} />
          <TextField id="hasElevator" label={t("commercialListings.hasElevator")} defaultValue={listing?.hasElevator} readOnly={readOnly} />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextareaField
            id="otherDetails"
            label={t("commercialListings.otherDetails")}
            defaultValue={listing?.otherDetails}
            readOnly={readOnly}
            className="sm:col-span-2"
          />
          <TextField id="rentAmount" label={t("commercialListings.rentAmount")} defaultValue={listing?.rentAmount} readOnly={readOnly} />
          <TextField id="paymentType" label={t("commercialListings.paymentType")} defaultValue={listing?.paymentType} readOnly={readOnly} />
          <TextField id="location" label={t("commercialListings.location")} defaultValue={listing?.location} readOnly={readOnly} />
          <TextField id="coordinates" label={t("commercialListings.coordinates")} defaultValue={listing?.coordinates} readOnly={readOnly} />
          <TextField id="hasKey" label={t("commercialListings.hasKey")} defaultValue={listing?.hasKey} readOnly={readOnly} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <Label className="text-sm font-medium">{t("commercialListings.publishingChannels")}</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLISHING_CHANNELS.map((channel) => (
            <label key={channel.key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!publishing[channel.key]}
                onCheckedChange={(checked) => {
                  if (readOnly) return;
                  setPublishing((prev) => ({ ...prev, [channel.key]: checked === true }));
                }}
                disabled={readOnly}
              />
              <span>{t(channel.labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <TextareaField id="notes" label={t("common.notes")} defaultValue={listing?.notes} readOnly={readOnly} />
      </div>
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
