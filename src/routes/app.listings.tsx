import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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

export const Route = createFileRoute("/app/listings")({
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
const STATUS_OCCUPIED = "مشغول";
const STATUS_UNAVAILABLE = "غير متاح";
const DEAL_THROUGH_OWNER = "المالك";
const DEAL_THROUGH_OFFICE = "المكتب";

const COMMERCIAL_FIELDS = [
  "contactDate",
  "listingCategory",
  "propertyStatus",
  "listingType",
  "adNumber",
  "dealThrough",
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


type BrokerageContractFormValue = {
  id: string;
  brokerageContract: string;
  licenseNumber: string;
  contractExpiry: string;
};

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

const PROPERTY_STATUS_OPTIONS = [
  { value: STATUS_AVAILABLE },
  { value: STATUS_OCCUPIED },
  { value: STATUS_UNAVAILABLE },
] as const;

const DEAL_THROUGH_OPTIONS = [
  { value: DEAL_THROUGH_OWNER, labelKey: "commercialListings.dealThroughOwner" },
  { value: DEAL_THROUGH_OFFICE, labelKey: "commercialListings.dealThroughOffice" },
] as const;

const LISTING_CATEGORY_COMMERCIAL = "Commercial";
const LISTING_CATEGORY_RESIDENTIAL = "Residential";
type ListingCategoryValue = typeof LISTING_CATEGORY_COMMERCIAL | typeof LISTING_CATEGORY_RESIDENTIAL;
type ListingTypeValue = "Rental" | "Sale";
type CommercialListingStatusKey = "Available" | "Occupied" | "Unavailable";

const LISTING_CATEGORY_OPTIONS = [
  { value: LISTING_CATEGORY_COMMERCIAL },
  { value: LISTING_CATEGORY_RESIDENTIAL },
] as const;

function normalizeListingCategory(value: string | null | undefined): ListingCategoryValue {
  const normalized = normalizeValue(value).toLowerCase();
  if (normalized === "residential" || normalized === "سكني") return LISTING_CATEGORY_RESIDENTIAL;
  return LISTING_CATEGORY_COMMERCIAL;
}

function normalizeListingType(value: string | null | undefined): ListingTypeValue {
  const normalized = normalizeValue(value).toLowerCase();
  if (normalized === "sale" || normalized === "بيع") return "Sale";
  return "Rental";
}

type PropertyTypeKey =
  | "Apartment"
  | "Shop"
  | "Office"
  | "Showroom"
  | "Building"
  | "Land"
  | "RestHouse"
  | "Villa"
  | "Warehouse"
  | "Other";

function normalizePropertyType(value: string | null | undefined): PropertyTypeKey | "" {
  const v = normalizeValue(value).toLowerCase();
  if (v === "شقة" || v === "apartment") return "Apartment";
  if (v === "محل" || v === "shop") return "Shop";
  if (v === "مكتب" || v === "office") return "Office";
  if (v === "معرض" || v === "showroom" || v === "gallery") return "Showroom";
  if (v === "عمارة" || v === "building") return "Building";
  if (v === "ارض" || v === "land") return "Land";
  if (v === "استراحة" || v === "resthouse" || v === "rest house") return "RestHouse";
  if (v === "فيلا" || v === "villa") return "Villa";
  if (v === "مستودع" || v === "warehouse") return "Warehouse";
  if (v === "اخري" || v === "أخرى" || v === "other") return "Other";
  // If value already matches a key (case-insensitive), return it normalized
  const mapping: Record<string, PropertyTypeKey> = {
    apartment: "Apartment",
    shop: "Shop",
    office: "Office",
    showroom: "Showroom",
    building: "Building",
    land: "Land",
    resthouse: "RestHouse",
    villa: "Villa",
    warehouse: "Warehouse",
    other: "Other",
  };
  if (v in mapping) return mapping[v as keyof typeof mapping];
  return "";
}

function statusKeyFromValue(value: string | null | undefined): CommercialListingStatusKey {
  const normalized = normalizeValue(value).toLowerCase();
  if (normalized === STATUS_OCCUPIED || normalized === "occupied") return "Occupied";
  if (normalized === STATUS_UNAVAILABLE || normalized === "unavailable") return "Unavailable";
  return "Available";
}

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

function makeContractId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `contract-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyBrokerageContract(): BrokerageContractFormValue {
  return {
    id: makeContractId(),
    brokerageContract: "",
    licenseNumber: "",
    contractExpiry: "",
  };
}

function normalizeBrokerageContracts(contracts: BrokerageContractFormValue[]) {
  return contracts
    .map((contract, index) => ({
      brokerageContract: contract.brokerageContract.trim(),
      licenseNumber: contract.licenseNumber.trim(),
      contractExpiry: contract.contractExpiry.trim(),
      sortOrder: index,
    }))
    .filter((contract) => contract.brokerageContract || contract.licenseNumber || contract.contractExpiry);
}

function buildCommercialPayload(
  fd: FormData,
  publishing: PublishingState,
  contracts: BrokerageContractFormValue[],
  original?: CommercialListing | null,
) {
  const payload: Record<string, unknown> = {};

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

  payload.brokerageContracts = normalizeBrokerageContracts(contracts);

  return payload;
}

function CommercialListingsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [deedQ, setDeedQ] = useState("");
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

  const hasAccess = auth.hasRole("Admin") || auth.isPartner || auth.user?.screenPermissions.includes("/app/listings");
  const canManage = auth.isStaff || auth.isPartner;

  // Aggregate all listing pages so we can search locally (including deed number)
  const listings = useQuery<CommercialListing[]>({
    queryKey: ["commercial-listings"],
    queryFn: async () => {
      const fetchPage = (pageNumber: number) =>
        api<CommercialListingSearchResult>("/api/listings", {
          query: {
            page: pageNumber,
            pageSize: 100,
            sortBy: sortBy || undefined,
            sortDir: sortDir || undefined,
          },
        });

      const firstPage = await fetchPage(1);
      const totalPages = Math.max(1, Math.ceil((firstPage.total ?? 0) / 100));
      if (totalPages === 1) return firstPage.items ?? [];

      const extraPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2)),
      );

      return [...(firstPage.items ?? []), ...extraPages.flatMap((r) => r.items ?? [])];
    },
    enabled: hasAccess,
  });

  const partners = useQuery({ queryKey: ["partners", "lookup"], queryFn: fetchPartners, enabled: hasAccess });

  const handleReset = () => {
    setQ("");
    setDeedQ("");
    setStatus("all");
    setPage(1);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>, publishing: PublishingState, contracts: BrokerageContractFormValue[]) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildCommercialPayload(fd, publishing, contracts);
      await api<CommercialListing>("/api/listings", { method: "POST", body: payload });
      toast.success(t("common.created"));
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["commercial-listings"] });
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>, publishing: PublishingState, contracts: BrokerageContractFormValue[]) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildCommercialPayload(fd, publishing, contracts, selected);
      if (Object.keys(payload).length === 0) {
        setSelected(null);
        return;
      }
      await api<CommercialListing>(`/api/listings/${selected.id}`, { method: "PUT", body: payload });
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
      await api(`/api/listings/${deleting.id}`, { method: "DELETE" });
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
    if (normalized === STATUS_AVAILABLE) return "info" as const;
    if (normalized === STATUS_OCCUPIED) return "warning" as const;
    if (normalized === STATUS_UNAVAILABLE) return "destructive" as const;
    return "neutral" as const;
  };

  const statusLabel = (value?: string | null) => {
    const normalized = normalizeValue(value);
    if (!normalized) return t("common.notProvided");
    if ([STATUS_AVAILABLE, STATUS_OCCUPIED, STATUS_UNAVAILABLE, "available", "occupied", "unavailable"].includes(normalized.toLowerCase())) {
      return t(`commercialListingStatus.${statusKeyFromValue(normalized)}`);
    }
    return value ?? t("common.notProvided");
  };

  const listingCategoryLabel = (value?: string | null) => t(`listingCategory.${normalizeListingCategory(value)}`);

  const columns: Column<CommercialListing>[] = [
    { key: "adNumber", header: t("commercialListings.adNumber"), cell: (r) => r.adNumber || t("common.notProvided") },
    { key: "contactDate", header: t("commercialListings.contactDate"), cell: (r) => r.contactDate || t("common.notProvided") },
    { key: "listingCategory", header: t("commercialListings.listingCategory"), cell: (r) => listingCategoryLabel(r.listingCategory) },
    { key: "propertyStatus", header: t("commercialListings.propertyStatus"), cell: (r) => <StatusBadge tone={statusTone(r.propertyStatus)}>{statusLabel(r.propertyStatus)}</StatusBadge> },
    { key: "dealThrough", header: t("commercialListings.dealThrough"), cell: (r) => {
        const normalized = normalizeValue(r.dealThrough);
        if (!normalized) return t("common.notProvided");
        if (normalized === DEAL_THROUGH_OWNER) return t("commercialListings.dealThroughOwner");
        if (normalized === DEAL_THROUGH_OFFICE) return t("commercialListings.dealThroughOffice");
        return r.dealThrough || t("common.notProvided");
      } },
    { key: "brokerageContractsCount", header: t("commercialListings.brokerageContracts"), cell: (r) => { const count = r.brokerageContracts?.length ?? 0; return count > 0 ? `${count}` : t("common.notProvided"); } },
    { key: "ownerName", header: t("commercialListings.ownerName"), cell: (r) => <span className="font-medium">{r.ownerName || t("common.notProvided")}</span> },
    { key: "deedNumber", header: t("commercialListings.deedNumber"), cell: (r) => (r.deedNumber ? <span className="font-mono text-sm">{r.deedNumber}</span> : t("common.notProvided")) },
    { key: "mobile1", header: t("commercialListings.mobile1"), cell: (r) => r.mobile1 || t("common.notProvided") },
    { key: "propertyType", header: t("commercialListings.propertyType"), cell: (r) => r.propertyType || t("common.notProvided") },
    { key: "rentAmount", header: t("commercialListings.rentAmount"), cell: (r) => r.rentAmount || t("common.notProvided") },
    { key: "paymentType", header: t("commercialListings.paymentType"), cell: (r) => r.paymentType || t("common.notProvided") },
    { key: "location", header: t("commercialListings.location"), cell: (r) => r.location || t("common.notProvided") },
    { key: "employee", header: t("common.employee"), cell: (r) => r.employee || t("common.notProvided") },
  ];

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.noScreenAccess")}
      </div>
    );
  }

  // Client-side filtering so `رقم الصك` (deedNumber) is searchable
  const filteredListings = useMemo(() => {
    const lower = q.trim().toLowerCase();
    const deedLower = deedQ.trim().toLowerCase();
    const items = listings.data ?? [];
    return items.filter((record) => {
      const qMatch =
        !lower ||
        [record.ownerName, record.adNumber, record.deedNumber, record.location, record.propertyType, record.propertyStatus]
          .some((v) => (v ?? "").toLowerCase().includes(lower));

      const deedMatch = !deedLower || (record.deedNumber ?? "").toLowerCase().includes(deedLower);

      const statusMatch = status === "all" || record.propertyStatus === status;
      return qMatch && deedMatch && statusMatch;
    });
  }, [listings.data, q, deedQ, status]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const visibleListings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  }, [filteredListings, page, pageSize]);

  return (
    <div>
      <PageHeader
        title={t("commercialListings.pageTitle")}
        subtitle={t("commercialListings.pageSubtitle")}
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

          <div className="sm:col-span-2 lg:col-span-1">
            <Label htmlFor="deedQ" className="text-xs font-medium">{t("commercialListings.deedNumber")}</Label>
            <Input
              id="deedQ"
              name="deedQ"
              placeholder={t("commercialListings.deedNumber")}
              value={deedQ}
              onChange={(e) => {
                setDeedQ(e.target.value);
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
                {PROPERTY_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
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
        rows={visibleListings}
        loading={listings.isLoading}
        error={listings.error}
        rowKey={(r) => r.id}
        onEdit={canManage ? (row) => setSelected(row) : undefined}
        onDelete={canManage ? (row) => setDeleting(row) : undefined}
        onRowClick={(row) => setSelected(row)}
      />

      {filteredListings.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("common.skip", { defaultValue: "Showing" })} {(page - 1) * pageSize + 1}
            {" - "}
            {Math.min(page * pageSize, filteredListings.length)} {t("common.of", { defaultValue: "of" })} {filteredListings.length}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              {t("common.previous")}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm">{page}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
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
  onSubmit: (e: React.FormEvent<HTMLFormElement>, publishing: PublishingState, contracts: BrokerageContractFormValue[]) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [publishing, setPublishing] = useState<PublishingState>(() => buildPublishingState(listing));
  const [broker, setBroker] = useState<string>(listing?.broker ?? "");
  const [listingCategory, setListingCategory] = useState<ListingCategoryValue>(normalizeListingCategory(listing?.listingCategory));
  const [propertyStatus, setPropertyStatus] = useState<string>(listing?.propertyStatus ?? STATUS_AVAILABLE);
  const [listingType, setListingType] = useState<ListingTypeValue>(normalizeListingType(listing?.listingType));
  const [propertyType, setPropertyType] = useState<PropertyTypeKey | "">(normalizePropertyType(listing?.propertyType));
  const [dealThrough, setDealThrough] = useState<string>(listing?.dealThrough ?? DEAL_THROUGH_OWNER);
  const [hasKey, setHasKey] = useState<boolean>(Boolean(listing?.hasKey));
  const [contracts, setContracts] = useState<BrokerageContractFormValue[]>(() => {
    const initialContracts = listing?.brokerageContracts?.length ? listing?.brokerageContracts : [null];
    return initialContracts.map((contract) => (contract ? {
      id: makeContractId(),
      brokerageContract: contract.brokerageContract ?? "",
      licenseNumber: contract.licenseNumber ?? "",
      contractExpiry: contract.contractExpiry ?? "",
    } : emptyBrokerageContract()));
  });

  const partnerOptions = useMemo(() => partners
    .filter((partner) => partner.fullName.trim().length > 0)
    .sort((a, b) => a.fullName.localeCompare(b.fullName)), [partners]);

  const hasCurrentBrokerInPartners = broker ? partnerOptions.some((partner) => partner.fullName === broker) : true;

  const updateContract = useCallback((id: string, field: keyof Omit<BrokerageContractFormValue, "id">, value: string) => {
    setContracts((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }, []);

  const addContract = useCallback(() => {
    setContracts((current) => [...current, emptyBrokerageContract()]);
  }, []);

  const removeContract = useCallback((id: string) => {
    setContracts((current) => {
      if (current.length <= 1) return current;
      return current.filter((item) => item.id !== id);
    });
  }, []);

  useEffect(() => {
    if (open) {
      setPublishing(buildPublishingState(listing));
      setBroker(listing?.broker ?? "");
      setListingCategory(normalizeListingCategory(listing?.listingCategory));
      setPropertyStatus(listing?.propertyStatus ?? STATUS_AVAILABLE);
      setListingType(normalizeListingType(listing?.listingType));
      setPropertyType(normalizePropertyType(listing?.propertyType));
      setDealThrough(listing?.dealThrough ?? DEAL_THROUGH_OWNER);
      setHasKey(Boolean(listing?.hasKey));
      setContracts(listing?.brokerageContracts?.length
        ? listing.brokerageContracts.map((contract) => ({
          id: makeContractId(),
          brokerageContract: contract.brokerageContract ?? "",
          licenseNumber: contract.licenseNumber ?? "",
          contractExpiry: contract.contractExpiry ?? "",
        }))
        : [emptyBrokerageContract()]);
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
      onSubmit={(e) => onSubmit(e, publishing, contracts)}
    >
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="adNumber" label={t("commercialListings.adNumber")} defaultValue={listing?.adNumber} readOnly={readOnly} />
          <TextField id="contactDate" label={t("commercialListings.contactDate")} defaultValue={listing?.contactDate} readOnly={readOnly} />
          <div className="space-y-2">
            <Label htmlFor="listingCategory" className="text-xs font-medium">{t("commercialListings.listingCategory")}</Label>
            <Select value={listingCategory} onValueChange={setListingCategory} disabled={readOnly}>
              <SelectTrigger id="listingCategory" className="mt-1">
                <SelectValue placeholder={t("commercialListings.listingCategory")} />
              </SelectTrigger>
              <SelectContent>
                {LISTING_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{t(`listingCategory.${option.value}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="listingCategory" value={listingCategory} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyStatus" className="text-xs font-medium">{t("commercialListings.propertyStatus")}</Label>
            <Select value={propertyStatus} onValueChange={setPropertyStatus} disabled={readOnly}>
              <SelectTrigger id="propertyStatus" className="mt-1">
                <SelectValue placeholder={t("commercialListings.propertyStatus")} />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{t(`commercialListingStatus.${statusKeyFromValue(option.value)}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="propertyStatus" value={propertyStatus} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="listingType" className="text-xs font-medium">{t("commercialListings.listingType")}</Label>
            <Select value={listingType} onValueChange={setListingType} disabled={readOnly}>
              <SelectTrigger id="listingType" className="mt-1">
                <SelectValue placeholder={t("commercialListings.listingType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rental">{t("listingType.Rental")}</SelectItem>
                <SelectItem value="Sale">{t("listingType.Sale")}</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="listingType" value={listingType} />
          </div>
          <TextField id="employee" label={t("common.employee")} defaultValue={listing?.employee} readOnly={readOnly} />
          <div className="space-y-2">
            <Label htmlFor="broker" className="text-xs font-medium">{t("commercialListings.broker")}</Label>
            <Select value={broker || "none"} onValueChange={(value) => setBroker(value === "none" ? "" : value)} disabled={readOnly}>
              <SelectTrigger id="broker" className="mt-1">
                <SelectValue placeholder={partnersLoading ? "Loading partners..." : "Select partner"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("common.notProvided")}</SelectItem>
                {partnerOptions.map((partner) => (
                  <SelectItem key={partner.id} value={partner.fullName}>{partner.fullName}</SelectItem>
                ))}
                {broker && !hasCurrentBrokerInPartners && <SelectItem value={broker}>{broker}</SelectItem>}
              </SelectContent>
            </Select>
            <input type="hidden" name="broker" value={broker} />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm font-medium">{t("commercialListings.brokerageContracts")}</Label>
          {!readOnly && (
            <Button type="button" variant="outline" size="sm" onClick={addContract}>
              <Plus className="me-1 h-4 w-4" />
              {t("commercialListings.addBrokerageContract")}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {contracts.map((contract, index) => (
            <BrokerageContractRow key={contract.id} contract={contract} index={index} readOnly={readOnly} onChange={updateContract} onRemove={removeContract} t={t} />
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="ownerName" label={t("commercialListings.ownerName")} defaultValue={listing?.ownerName} readOnly={readOnly} />
          <TextField id="mobile1" label={t("commercialListings.mobile1")} defaultValue={listing?.mobile1} readOnly={readOnly} />
          <TextField id="mobile2" label={t("commercialListings.mobile2")} defaultValue={listing?.mobile2} readOnly={readOnly} />
          <TextField id="availableUnits" label={t("commercialListings.availableUnits")} defaultValue={listing?.availableUnits} readOnly={readOnly} />
          <TextField id="deedNumber" label={t("commercialListings.deedNumber")} defaultValue={listing?.deedNumber} readOnly={readOnly} />
          <div className="space-y-2">
            <Label htmlFor="propertyType" className="text-xs font-medium">{t("commercialListings.propertyType")}</Label>
            <Select value={propertyType} onValueChange={setPropertyType} disabled={readOnly}>
              <SelectTrigger id="propertyType" className="mt-1">
                <SelectValue placeholder={t("commercialListings.propertyType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Apartment">{t("propertyType.Apartment")}</SelectItem>
                <SelectItem value="Shop">{t("propertyType.Shop")}</SelectItem>
                <SelectItem value="Office">{t("propertyType.Office")}</SelectItem>
                <SelectItem value="Showroom">{t("propertyType.Showroom")}</SelectItem>
                <SelectItem value="Building">{t("propertyType.Building")}</SelectItem>
                <SelectItem value="Land">{t("propertyType.Land")}</SelectItem>
                <SelectItem value="RestHouse">{t("propertyType.RestHouse")}</SelectItem>
                <SelectItem value="Villa">{t("propertyType.Villa")}</SelectItem>
                <SelectItem value="Warehouse">{t("propertyType.Warehouse")}</SelectItem>
                <SelectItem value="Other">{t("propertyType.Other")}</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="propertyType" value={propertyType} />
          </div>
          <TextField id="roomsCount" label={t("commercialListings.roomsCount")} defaultValue={listing?.roomsCount} readOnly={readOnly} />
          <TextField id="buildingAge" label={t("commercialListings.buildingAge")} defaultValue={listing?.buildingAge} readOnly={readOnly} />
          <TextField id="hasElevator" label={t("commercialListings.hasElevator")} defaultValue={listing?.hasElevator} readOnly={readOnly} />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextareaField id="otherDetails" label={t("commercialListings.otherDetails")} defaultValue={listing?.otherDetails} readOnly={readOnly} className="sm:col-span-2" />
          <TextField id="rentAmount" label={listingType === "Sale" ? t("commercialListings.salePrice") : t("commercialListings.rentAmount")} defaultValue={listing?.rentAmount} readOnly={readOnly} />
          <TextField id="paymentType" label={t("commercialListings.paymentType")} defaultValue={listing?.paymentType} readOnly={readOnly} />
          <TextField id="location" label={t("commercialListings.location")} defaultValue={listing?.location} readOnly={readOnly} />
          <TextField id="coordinates" label={t("commercialListings.coordinates")} defaultValue={listing?.coordinates} readOnly={readOnly} />
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3">
            <Checkbox id="hasKey" checked={hasKey} onCheckedChange={(checked) => setHasKey(checked === true)} disabled={readOnly} />
            <div className="space-y-1">
              <Label htmlFor="hasKey" className="text-sm font-medium">{t("commercialListings.hasKey")}</Label>
            </div>
            <input type="hidden" name="hasKey" value={String(hasKey)} />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <Label className="text-sm font-medium">{t("commercialListings.publishingChannels")}</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLISHING_CHANNELS.map((channel) => (
            <label key={channel.key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!publishing[channel.key]} onCheckedChange={(checked) => { if (readOnly) return; setPublishing((prev) => ({ ...prev, [channel.key]: checked === true })); }} disabled={readOnly} />
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

function TextField({ id, label, defaultValue, readOnly }: { id: string; label: string; defaultValue?: string | null; readOnly: boolean; }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      <Input id={id} name={id} defaultValue={defaultValue ?? ""} readOnly={readOnly} disabled={readOnly} className="mt-1" />
    </div>
  );
}

function TextareaField({ id, label, defaultValue, readOnly, className }: { id: string; label: string; defaultValue?: string | null; readOnly: boolean; className?: string; }) {
  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      <Textarea id={id} name={id} defaultValue={defaultValue ?? ""} readOnly={readOnly} disabled={readOnly} rows={3} className="mt-1" />
    </div>
  );
}

const BrokerageContractRow = memo(function BrokerageContractRow({ contract, index, readOnly, onChange, onRemove, t }: { contract: BrokerageContractFormValue; index: number; readOnly: boolean; onChange: (id: string, field: keyof Omit<BrokerageContractFormValue, "id">, value: string) => void; onRemove: (id: string) => void; t: (key: string) => string; }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{t("commercialListings.brokerageContracts")} {index + 1}</span>
        {!readOnly && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(contract.id)}>
            <X className="me-1 h-4 w-4" />
            {t("common.delete")}
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`brokerageContract-${contract.id}`} className="text-xs font-medium">{t("commercialListings.brokerageContract")}</Label>
          <Input id={`brokerageContract-${contract.id}`} value={contract.brokerageContract} onChange={(event) => onChange(contract.id, "brokerageContract", event.target.value)} readOnly={readOnly} disabled={readOnly} className="mt-1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`licenseNumber-${contract.id}`} className="text-xs font-medium">{t("commercialListings.licenseNumber")}</Label>
          <Input id={`licenseNumber-${contract.id}`} value={contract.licenseNumber} onChange={(event) => onChange(contract.id, "licenseNumber", event.target.value)} readOnly={readOnly} disabled={readOnly} className="mt-1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`contractExpiry-${contract.id}`} className="text-xs font-medium">{t("commercialListings.contractExpiry")}</Label>
          <Input id={`contractExpiry-${contract.id}`} value={contract.contractExpiry} onChange={(event) => onChange(contract.id, "contractExpiry", event.target.value)} readOnly={readOnly} disabled={readOnly} className="mt-1" />
        </div>
      </div>
    </div>
  );
});
