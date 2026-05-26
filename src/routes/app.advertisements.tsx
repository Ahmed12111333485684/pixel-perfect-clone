import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Advertisement, type PropertyDto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/advertisements")({
  component: AdvertisementsPage,
});

interface AdvertisementsSearchResult {
  total: number;
  page: number;
  pageSize: number;
  items: Advertisement[];
}

const STATUS_VALUES = [
  "تمت الازالة",
  "تم الطلب",
  "تم التركيب",
  "في انتظار التركيب",
  "انتهي الاعلان",
] as const;
const PROPERTY_TYPE_VALUES = ["ايجار", "بيع"] as const;
const AD_TYPE_VALUES = ["لوحة", "استكر", "لوحة(بار)"] as const;
const INSTALLATION_TYPE_VALUES = ["جداري", "ارضي", "تثبيت سور", "استكر"] as const;

const ADVERTISEMENT_FIELDS = [
  "code",
  "status",
  "visitDate",
  "expiryDate",
  "adNumber",
  "propertyType",
  "location",
  "quantity",
  "locationChangeCount",
  "adType",
  "installationType",
  "officeName",
  "phoneNumber",
  "boardPrice",
  "remainingAmount",
  "notes",
] as const;

type AdvertisementFieldKey = (typeof ADVERTISEMENT_FIELDS)[number];

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim();
}

function readFieldValue(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function toIsoDate(value: string) {
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseOptionalNumber(raw: string) {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function buildAdvertisementPayload(fd: FormData, original?: Advertisement | null) {
  const payload: Record<string, unknown> = {};

  ADVERTISEMENT_FIELDS.forEach((key) => {
    const value = readFieldValue(fd, key);
    if (key === "visitDate" || key === "expiryDate") {
      const iso = toIsoDate(value);
      const originalDate = original?.[key] ? String(original[key]).slice(0, 10) : "";
      if (!original || (iso ?? "") !== originalDate) payload[key] = iso;
      return;
    }

    if (key === "quantity") {
      const parsed = parseOptionalNumber(value);
      const nextValue = parsed === undefined ? undefined : Number(parsed);
      if (!original || nextValue !== original.quantity) payload[key] = nextValue;
      return;
    }

    if (key === "locationChangeCount") {
      const parsed = parseOptionalNumber(value);
      const nextValue = parsed === undefined ? undefined : Number(parsed);
      if (!original || nextValue !== original.locationChangeCount) payload[key] = nextValue;
      return;
    }

    if (key === "boardPrice" || key === "remainingAmount") {
      const parsed = parseOptionalNumber(value);
      const originalValue = original?.[key] == null ? undefined : Number(original[key]);
      if (!original || parsed !== originalValue) payload[key] = parsed;
      return;
    }

    const originalValue = normalizeValue(
      original?.[key as AdvertisementFieldKey] as string | null | undefined,
    );
    if (!original || value !== originalValue) payload[key] = value;
  });

  const propertyRaw = readFieldValue(fd, "propertyId");
  const propertyId = propertyRaw && propertyRaw !== "none" ? Number(propertyRaw) : undefined;
  if (!original || propertyId !== (original.propertyId ?? undefined)) {
    payload.propertyId = propertyId;
  }

  return payload;
}

function AdvertisementsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Advertisement | null>(null);
  const [deleting, setDeleting] = useState<Advertisement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const hasAccess =
    auth.hasRole("Admin") ||
    auth.isPartner ||
    auth.user?.screenPermissions.includes("/app/advertisements");
  const canManage = auth.isStaff || auth.isPartner;

  const advertisements = useQuery<Advertisement[]>({
    queryKey: ["advertisements"],
    queryFn: async () => {
      const fetchPage = (pageNumber: number) =>
        api<AdvertisementsSearchResult>("/api/advertisements", {
          query: {
            page: pageNumber,
            pageSize: 100,
            sortBy: "createdAt",
            sortDir: "desc",
          },
        });

      const firstPage = await fetchPage(1);
      const totalPages = Math.max(1, Math.ceil((firstPage.total ?? 0) / 100));
      if (totalPages === 1) return firstPage.items ?? [];

      const extraPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2)),
      );

      return [...(firstPage.items ?? []), ...extraPages.flatMap((result) => result.items ?? [])];
    },
    enabled: hasAccess,
  });

  const properties = useQuery({
    queryKey: ["properties", "lookup", "advertisements"],
    queryFn: () => api<PropertyDto[]>("/api/properties"),
    enabled: hasAccess,
  });

  const handleReset = () => {
    setQ("");
    setStatus("all");
    setPage(1);
  };

  const filteredAdvertisements = useMemo(() => {
    const lowerSearch = q.trim().toLowerCase();
    return (advertisements.data ?? []).filter((advertisement) => {
      const propertyDeed =
        properties.data?.find((p) => p.id === advertisement.propertyId)?.deedNumber ?? "";
      const searchMatch =
        !lowerSearch ||
        [
          advertisement.code,
          advertisement.status,
          advertisement.adNumber,
          advertisement.propertyCodeOrFallback,
          advertisement.propertyType,
          advertisement.location,
          String(advertisement.quantity),
          String(advertisement.locationChangeCount),
          advertisement.adType,
          advertisement.installationType,
          advertisement.officeName,
          advertisement.phoneNumber,
          String(advertisement.boardPrice ?? ""),
          String(advertisement.remainingAmount ?? ""),
          advertisement.notes,
          propertyDeed,
        ].some((value) => (value ?? "").toLowerCase().includes(lowerSearch));
      const statusMatch = status === "all" || advertisement.status === status;
      return searchMatch && statusMatch;
    });
  }, [advertisements.data, q, status]);

  const totalPages = Math.max(1, Math.ceil(filteredAdvertisements.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const visibleAdvertisements = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAdvertisements.slice(start, start + pageSize);
  }, [filteredAdvertisements, page, pageSize]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildAdvertisementPayload(fd);
      await api<Advertisement>("/api/advertisements", { method: "POST", body: payload });
      toast.success(t("common.created"));
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["advertisements"] });
    } catch {
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
      const payload = buildAdvertisementPayload(fd, selected);
      if (Object.keys(payload).length === 0) {
        setSelected(null);
        return;
      }
      await api<Advertisement>(`/api/advertisements/${selected.id}`, {
        method: "PUT",
        body: payload,
      });
      toast.success(t("common.updated"));
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["advertisements"] });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingRecord(true);
    try {
      await api(`/api/advertisements/${deleting.id}`, { method: "DELETE" });
      toast.success(t("common.deleted"));
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["advertisements"] });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDeletingRecord(false);
    }
  };

  const statusTone = (value?: string | null) => {
    const normalized = normalizeValue(value);
    if (normalized === "تم التركيب") return "success" as const;
    if (normalized === "في انتظار التركيب" || normalized === "تم الطلب") return "warning" as const;
    if (normalized === "تمت الازالة" || normalized === "انتهي الاعلان") return "neutral" as const;
    return "info" as const;
  };

  const columns: Column<Advertisement>[] = [
    {
      key: "code",
      header: t("advertisements.code"),
      cell: (row) => <span className="font-medium">{row.code}</span>,
    },
    {
      key: "status",
      header: t("advertisements.status"),
      cell: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>,
    },
    {
      key: "propertyCodeOrFallback",
      header: t("advertisements.propertyCodeOrFallback"),
      cell: (row) => row.propertyCodeOrFallback || "لا يوجد",
    },
    {
      key: "propertyType",
      header: t("advertisements.propertyType"),
      cell: (row) => row.propertyType,
    },
    {
      key: "adType",
      header: t("advertisements.adType"),
      cell: (row) => row.adType,
    },
    {
      key: "installationType",
      header: t("advertisements.installationType"),
      cell: (row) => row.installationType,
    },
    {
      key: "quantity",
      header: t("advertisements.quantity"),
      cell: (row) => row.quantity,
    },
    {
      key: "locationChangeCount",
      header: t("advertisements.locationChangeCount"),
      cell: (row) => row.locationChangeCount,
    },
    {
      key: "visitDate",
      header: t("advertisements.visitDate"),
      cell: (row) => (row.visitDate ? formatDate(row.visitDate) : "-"),
    },
    {
      key: "expiryDate",
      header: t("advertisements.expiryDate"),
      cell: (row) => (row.expiryDate ? formatDate(row.expiryDate) : "-"),
    },
    {
      key: "boardPrice",
      header: t("advertisements.boardPrice"),
      cell: (row) => row.boardPrice ?? "-",
    },
    {
      key: "remainingAmount",
      header: t("advertisements.remainingAmount"),
      cell: (row) => row.remainingAmount ?? "-",
    },
    {
      key: "officeName",
      header: t("advertisements.officeName"),
      cell: (row) => row.officeName || t("common.notProvided"),
    },
  ];

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.noScreenAccess")}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("advertisements.pageTitle")}
        subtitle={t("advertisements.pageSubtitle")}
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="me-1 h-4 w-4" />
              {t("common.add")}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="q" className="text-xs font-medium">
              {t("common.search")}
            </Label>
            <Input
              id="q"
              placeholder={t("common.search")}
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
              {t("advertisements.status")}
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
                {STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
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
        rows={visibleAdvertisements}
        loading={advertisements.isLoading}
        error={advertisements.error}
        rowKey={(row) => row.id}
        onEdit={canManage ? (row) => setSelected(row) : undefined}
        onDelete={canManage ? (row) => setDeleting(row) : undefined}
        onRowClick={(row) => setSelected(row)}
      />

      {filteredAdvertisements.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("common.skip", { defaultValue: "Showing" })} {(page - 1) * pageSize + 1}
            {" - "}
            {Math.min(page * pageSize, filteredAdvertisements.length)}{" "}
            {t("common.of", { defaultValue: "of" })} {filteredAdvertisements.length}
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

      <AdvertisementDialog
        open={creating}
        onOpenChange={setCreating}
        advertisement={null}
        properties={properties.data ?? []}
        readOnly={!canManage}
        submitting={submitting}
        title={`${t("common.add")} ${t("advertisements.pageTitle")}`}
        submitLabel={t("common.create")}
        onSubmit={handleCreate}
      />

      <AdvertisementDialog
        open={!!selected}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
        advertisement={selected}
        properties={properties.data ?? []}
        readOnly={!canManage}
        submitting={submitting}
        title={canManage ? t("common.edit") : t("common.details")}
        submitLabel={canManage ? t("common.save") : t("common.close")}
        onSubmit={
          canManage
            ? handleUpdate
            : (e) => {
                e.preventDefault();
                setSelected(null);
              }
        }
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(value) => {
          if (!value) setDeleting(null);
        }}
        title={t("common.delete")}
        description={deleting?.code ?? t("advertisements.pageTitle")}
        confirmLabel={t("common.delete")}
        destructive
        loading={deletingRecord}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function AdvertisementDialog({
  open,
  onOpenChange,
  advertisement,
  properties,
  readOnly,
  submitting,
  title,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  advertisement: Advertisement | null;
  properties: PropertyDto[];
  readOnly: boolean;
  submitting: boolean;
  title: string;
  submitLabel: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      submitLabel={submitLabel}
      submitting={submitting}
      readOnly={readOnly}
      size="lg"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">{t("advertisements.code")}</Label>
          <Input
            id="code"
            name="code"
            defaultValue={advertisement?.code ?? ""}
            required
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">{t("advertisements.status")}</Label>
          <Select
            name="status"
            defaultValue={advertisement?.status ?? STATUS_VALUES[0]}
            disabled={readOnly}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visitDate">{t("advertisements.visitDate")}</Label>
          <Input
            id="visitDate"
            name="visitDate"
            type="date"
            defaultValue={
              advertisement?.visitDate ? String(advertisement.visitDate).slice(0, 10) : ""
            }
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiryDate">{t("advertisements.expiryDate")}</Label>
          <Input
            id="expiryDate"
            name="expiryDate"
            type="date"
            defaultValue={
              advertisement?.expiryDate ? String(advertisement.expiryDate).slice(0, 10) : ""
            }
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adNumber">{t("advertisements.adNumber")}</Label>
          <Input
            id="adNumber"
            name="adNumber"
            defaultValue={advertisement?.adNumber ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="propertyType">{t("advertisements.propertyType")}</Label>
          <Select
            name="propertyType"
            defaultValue={advertisement?.propertyType ?? PROPERTY_TYPE_VALUES[0]}
            disabled={readOnly}
          >
            <SelectTrigger id="propertyType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="location">{t("advertisements.location")}</Label>
          <Input
            id="location"
            name="location"
            defaultValue={advertisement?.location ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">{t("advertisements.quantity")}</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            defaultValue={advertisement?.quantity ?? 1}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationChangeCount">{t("advertisements.locationChangeCount")}</Label>
          <Input
            id="locationChangeCount"
            name="locationChangeCount"
            type="number"
            min={0}
            defaultValue={advertisement?.locationChangeCount ?? 0}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="propertyId">{t("advertisements.propertyCodeOrFallback")}</Label>
          <Select
            name="propertyId"
            defaultValue={advertisement?.propertyId ? String(advertisement.propertyId) : "none"}
            disabled={readOnly}
          >
            <SelectTrigger id="propertyId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">لا يوجد</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={String(property.id)}>
                  {`#${property.id} - ${property.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adType">{t("advertisements.adType")}</Label>
          <Select
            name="adType"
            defaultValue={advertisement?.adType ?? AD_TYPE_VALUES[0]}
            disabled={readOnly}
          >
            <SelectTrigger id="adType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AD_TYPE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="installationType">{t("advertisements.installationType")}</Label>
          <Select
            name="installationType"
            defaultValue={advertisement?.installationType ?? INSTALLATION_TYPE_VALUES[0]}
            disabled={readOnly}
          >
            <SelectTrigger id="installationType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTALLATION_TYPE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="officeName">{t("advertisements.officeName")}</Label>
          <Input
            id="officeName"
            name="officeName"
            defaultValue={advertisement?.officeName ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">{t("advertisements.phoneNumber")}</Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            defaultValue={advertisement?.phoneNumber ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="boardPrice">{t("advertisements.boardPrice")}</Label>
          <Input
            id="boardPrice"
            name="boardPrice"
            type="number"
            step="0.01"
            min={0}
            defaultValue={advertisement?.boardPrice ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="remainingAmount">{t("advertisements.remainingAmount")}</Label>
          <Input
            id="remainingAmount"
            name="remainingAmount"
            type="number"
            step="0.01"
            min={0}
            defaultValue={advertisement?.remainingAmount ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">{t("advertisements.notes")}</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={advertisement?.notes ?? ""}
            rows={4}
            readOnly={readOnly}
          />
        </div>
      </div>
    </FormDialog>
  );
}
