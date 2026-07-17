import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, fetchPartners, createPartner, type CommercialListing, type Partner, type CommercialListingImage, type UserDto, type Amenity, ApiError } from "@/lib/api";
import { PartnerDialog } from "@/components/partners/PartnerDialog";
import { useAuth } from "@/lib/auth";
import { todayLocal } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ListingLocationMap } from "@/components/ListingLocationMap";
import { Plus, X, LayoutGrid, List, FileImage, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PhoneField } from "@/components/form/PhoneField";
import { ComboboxField } from "@/components/form/ComboboxField";
import { MultiComboboxField } from "@/components/form/MultiComboboxField";
import { CITIES, getDistricts } from "@/lib/locations";
import { PAYMENT_TYPES } from "@/lib/payment-types";
import { PROPERTY_TYPES_BY_CATEGORY, getPropertyTypesByCategory } from "@/lib/property-types";
import { CommercialListingImageManager } from "@/components/CommercialListingImageManager";
import { resolveApiAssetUrl } from "@/lib/api";
import { MediaLightbox } from "@/components/MediaLightbox";
export const Route = createFileRoute("/app/listings")({
  validateSearch: (search: Record<string, unknown>) => ({
    selected: search.selected ? Number(search.selected) : undefined,
  }),
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
  "dealThrough",
  "employee",
  "broker",
  "ownerName",
  "mobile1",
  "mobile2",
  "availableUnits",
  "deedNumber",
  "propertyType",
  "offerCode",
  "roomsCount",
  "buildingAge",
  "hasElevator",
  "adText1",
  "adText2",
  "rentAmount",
  "paymentType",
  "location",
  "coordinates",
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
  { value: STATUS_AVAILABLE, labelKey: "commercialListingStatus.Available" },
  { value: STATUS_OCCUPIED, labelKey: "commercialListingStatus.Occupied" },
  { value: STATUS_UNAVAILABLE, labelKey: "commercialListingStatus.Unavailable" },
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

function listingCategoryToArabic(cat: string): string {
  return cat === LISTING_CATEGORY_RESIDENTIAL ? "سكني" : "تجاري";
}

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
  if (v === "اخري" || v === "أخرى" || v === "اخري" || v === "other") return "Other";
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

function readBooleanField(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim().toLowerCase() === "true";
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
  _original?: CommercialListing | null,
) {
  const payload: Record<string, unknown> = {};

  COMMERCIAL_FIELDS.forEach((key) => {
    payload[key] = readFieldValue(fd, key);
  });

  PUBLISHING_CHANNELS.forEach((channel) => {
    payload[channel.key] = publishing[channel.key] ? PUBLISHED_VALUE : "";
  });

  payload.isOfficeListing = readBooleanField(fd, "isOfficeListing");
  payload.publicVisible = readBooleanField(fd, "publicVisible");
  payload.hasKey = readBooleanField(fd, "hasKey");

  const parentIdStr = fd.get("parentId");
  if (parentIdStr) {
    payload.parentId = parseInt(parentIdStr as string, 10);
  }

  payload.city = readFieldValue(fd, "city");
  const districtRaw = fd.get("district");
  if (districtRaw) {
    try { payload.district = JSON.parse(String(districtRaw)); }
    catch { payload.district = [String(districtRaw)]; }
  }

  payload.brokerageContracts = normalizeBrokerageContracts(contracts);

  const amenityIdsStr = fd.get("amenityIds");
  if (amenityIdsStr) {
    payload.amenityIds = String(amenityIdsStr).split(",").map(Number).filter(n => n > 0);
  } else {
    payload.amenityIds = [];
  }

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
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<CommercialListing | null>(null);
  const [deleting, setDeleting] = useState<CommercialListing | null>(null);
  const [creatingUnitFor, setCreatingUnitFor] = useState<CommercialListing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [lightboxImages, setLightboxImages] = useState<{ src: string; alt: string; mimeType?: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);

  const createPartnerMut = useMutation({
    mutationFn: async (vals: {
      fullName: string;
      phone?: string;
      email?: string;
      nationalId?: string;
      falLicenseNumber?: string;
      commercialRegistrationNumber?: string;
      location?: string;
      notes?: string;
      partnerType?: string;
      companyName?: string;
      photo?: File | null;
    }) => {
      const formData = new FormData();
      formData.append("fullName", vals.fullName);
      if (vals.phone) formData.append("phone", vals.phone);
      if (vals.email) formData.append("email", vals.email);
      if (vals.nationalId) formData.append("nationalId", vals.nationalId);
      if (vals.falLicenseNumber) formData.append("falLicenseNumber", vals.falLicenseNumber);
      if (vals.commercialRegistrationNumber)
        formData.append("commercialRegistrationNumber", vals.commercialRegistrationNumber);
      if (vals.location) formData.append("location", vals.location);
      if (vals.notes) formData.append("notes", vals.notes);
      if (vals.partnerType) formData.append("partnerType", vals.partnerType);
      if (vals.companyName) formData.append("companyName", vals.companyName);
      if (vals.photo) formData.append("photo", vals.photo);
      await createPartner(formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners", "lookup"] });
      toast.success(t("common.success"));
      setPartnerDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openLightbox = (listing: CommercialListing, startIndex: number) => {
    setLightboxImages(
      (listing.images ?? []).map((i) => ({
        src: resolveApiAssetUrl(i.url),
        alt: i.originalFileName,
        mimeType: i.mimeType,
      })),
    );
    setLightboxIndex(startIndex);
  };

  const hasAccess = auth.hasRole("Admin") || auth.isPartner || auth.user?.screenPermissions.includes("/app/listings");
  const canManage = auth.isStaff || auth.isPartner;

  // Aggregate all listing pages so we can search locally (including deed number)
  const listings = useQuery<CommercialListing[]>({
    queryKey: ["commercial-listings"],
    queryFn: async () => {
      const fetchPage = (pageNumber: number) =>
        api<CommercialListingSearchResult>("/listings", {
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
  const users = useQuery({ queryKey: ["users", "lookup"], queryFn: () => api<UserDto[]>("/users"), enabled: hasAccess });
  const amenities = useQuery({ queryKey: ["amenities"], queryFn: () => api<Amenity[]>("/amenities"), enabled: hasAccess });

  const { selected: selectedId } = Route.useSearch();
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!selectedId || autoOpenedRef.current || !listings.data) return;
    const match = listings.data.find((l) => l.id === selectedId);
    if (match) {
      autoOpenedRef.current = true;
      setSelected(match);
      window.history.replaceState({}, "", "/app/listings");
    }
  }, [selectedId, listings.data]);

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
      await api<CommercialListing>("/listings", { method: "POST", body: payload });
      toast.success(t("common.created"));
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["commercial-listings"] });
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error(t("common.error"));
      }
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
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error(t("common.error"));
      }
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
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
    { key: "contactDate", header: t("commercialListings.contactDate"), cell: (r) => r.contactDate || t("common.notProvided"), sortable: true },
    { key: "listingCategory", header: t("commercialListings.listingCategory"), cell: (r) => listingCategoryLabel(r.listingCategory), sortable: true },
    { key: "propertyStatus", header: t("commercialListings.propertyStatus"), cell: (r) => <StatusBadge tone={statusTone(r.propertyStatus)}>{statusLabel(r.propertyStatus)}</StatusBadge>, sortable: true },
    {
      key: "dealThrough", header: t("commercialListings.dealThrough"), cell: (r) => {
        const normalized = normalizeValue(r.dealThrough);
        if (!normalized) return t("common.notProvided");
        if (normalized === DEAL_THROUGH_OWNER) return t("commercialListings.dealThroughOwner");
        if (normalized === DEAL_THROUGH_OFFICE) return t("commercialListings.dealThroughOffice");
        return r.dealThrough || t("common.notProvided");
      }, sortable: true
    },
    { key: "brokerageContractsCount", header: t("commercialListings.brokerageContracts"), cell: (r) => { const count = r.brokerageContracts?.length ?? 0; return count > 0 ? `${count}` : t("common.notProvided"); } },
    { key: "ownerName", header: t("commercialListings.ownerName"), cell: (r) => <span className="font-medium">{r.ownerName || t("common.notProvided")}</span>, sortable: true },
    { key: "deedNumber", header: t("commercialListings.deedNumber"), cell: (r) => (r.deedNumber ? <span className="font-mono text-sm">{r.deedNumber}</span> : t("common.notProvided")) },
    { key: "mobile1", header: t("commercialListings.mobile1"), cell: (r) => r.mobile1 || t("common.notProvided") },
    { key: "propertyType", header: t("commercialListings.propertyType"), cell: (r) => r.propertyType ? t(`propertyType.${r.propertyType}`, { defaultValue: r.propertyType }) : t("common.notProvided"), sortable: true },
    { key: "rentAmount", header: t("commercialListings.rentAmount"), cell: (r) => r.rentAmount || t("common.notProvided"), sortable: true },
    { key: "paymentType", header: t("commercialListings.paymentType"), cell: (r) => r.paymentType || t("common.notProvided"), sortable: true },
    { key: "city", header: t("common.city"), cell: (r) => r.city || t("common.notProvided"), sortable: true },
    { key: "district", header: t("common.district"), cell: (r) => Array.isArray(r.district) ? r.district.join(" - ") : (r.district || t("common.notProvided")), sortable: true },
    { key: "location", header: t("commercialListings.location"), cell: (r) => r.location || t("common.notProvided"), sortable: true },
    { key: "amenities", header: t("nav.amenities", { defaultValue: "Amenities" }), cell: (r) => r.amenities && r.amenities.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {r.amenities.map(a => <span key={a.id} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{a.name}</span>)}
      </div>
    ) : t("common.notProvided") },
    { key: "employee", header: t("common.employee"), cell: (r) => r.employee || t("common.notProvided"), sortable: true },
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
        [record.ownerName, record.deedNumber, record.city, Array.isArray(record.district) ? record.district.join(" ") : record.district, record.location, record.propertyType, record.propertyStatus, record.offerCode, record.mobile1, record.mobile2]
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

  const unitInitialState = useMemo(() => {
    if (!creatingUnitFor) return null;
    const src = creatingUnitFor as any;
    return {
      parentId: src.id,
      contactDate: src.contactDate,
      ownerName: src.ownerName,
      city: src.city,
      district: src.district,
      location: src.location,
      employee: src.employee,
      broker: src.broker,
      dealThrough: src.dealThrough,
      listingCategory: src.listingCategory,
      mobile1: src.mobile1,
      mobile2: src.mobile2,
      isOfficeListing: src.isOfficeListing,
      propertyType: "Apartment", // Default
      createdAt: new Date().toISOString(),
    } as unknown as CommercialListing;
  }, [creatingUnitFor]);

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

          <div className="w-full">
            <Label className="text-xs font-medium">{t("common.sortBy")}</Label>
            <Select
              value={`${sortBy}-${sortDir}`}
              onValueChange={(val) => {
                const [k, d] = val.split("-");
                setSortBy(k);
                setSortDir(d as "asc" | "desc");
                setPage(1);
              }}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder={t("common.sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">{t("common.sortNewest")}</SelectItem>
                <SelectItem value="createdAt-asc">{t("common.sortOldest")}</SelectItem>
                <SelectItem value="contactDate-desc">{t("common.sortContactDateNewest")}</SelectItem>
                <SelectItem value="contactDate-asc">{t("common.sortContactDateOldest")}</SelectItem>
                <SelectItem value="rentAmount-desc">{t("common.sortPriceHighest")}</SelectItem>
                <SelectItem value="rentAmount-asc">{t("common.sortPriceLowest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleReset} className="w-fit">
              {t("common.filter")}
              {(q || status !== "all") && <X className="ms-1 h-3 w-3" />}
            </Button>
          </div>
          <div className="flex items-center rounded-md border border-border p-1 bg-muted/50">
            <Button
              size="sm"
              variant={viewMode === "card" ? "secondary" : "ghost"}
              className="h-7 px-2"
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "secondary" : "ghost"}
              className="h-7 px-2"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {listings.isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">
          {t("common.loading", { defaultValue: "Loading..." })}
        </div>
      ) : listings.error ? (
        <div className="rounded-xl border border-dashed border-destructive/40 p-8 text-center text-destructive">
          {t("common.error", { defaultValue: "An error occurred." })}
        </div>
      ) : visibleListings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          {t("common.noData", { defaultValue: "No data found." })}
        </div>
      ) : viewMode === "table" ? (
        <DataTable
          columns={columns}
          rows={visibleListings}
          loading={listings.isLoading}
          error={listings.error}
          rowKey={(r) => r.id}
          onEdit={canManage ? (row) => setSelected(row) : undefined}
          onDelete={canManage ? (row) => setDeleting(row) : undefined}
          onRowClick={(row) => setSelected(row)}
          sortKey={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleListings.map((r) => (
            <div
              key={r.id}
              className="group cursor-pointer flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => setSelected(r)}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {r.images && r.images.length > 0 ? (
                  <div 
                    className="w-full sm:w-1/3 aspect-video sm:aspect-square overflow-hidden rounded-lg bg-muted relative group/img cursor-zoom-in flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightbox(r, 0);
                    }}
                  >
                    <img
                      src={resolveApiAssetUrl(r.images.find(img => img.isPrimary)?.url || r.images[0].url)}
                      alt={r.images[0].originalFileName}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/60 p-1 opacity-0 transition-opacity group-hover/img:opacity-100">
                      <span className="text-xs text-white">{t("common.viewImages", { count: r.images.length })}</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full sm:w-1/3 aspect-video sm:aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 text-muted-foreground flex-shrink-0">
                    <FileImage className="mb-1 h-6 w-6 opacity-20" />
                    <span className="text-[10px] uppercase tracking-wider">{t("common.noImage")}</span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="font-medium truncate" title={r.ownerName || t("common.notProvided")}>
                      {r.ownerName || t("common.notProvided")}
                    </div>
                    <StatusBadge tone={statusTone(r.propertyStatus)}>
                      {statusLabel(r.propertyStatus)}
                    </StatusBadge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("commercialListings.propertyType")}</span>
                    <span>{r.propertyType ? t(`propertyType.${r.propertyType}`, { defaultValue: r.propertyType }) : t("common.notProvided")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("commercialListings.listingCategory")}</span>
                    <span>{listingCategoryLabel(r.listingCategory)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("common.city")}</span>
                    <span className="truncate max-w-[120px]">{r.city || t("common.notProvided")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("common.district")}</span>
                    <span className="truncate max-w-[120px]">{Array.isArray(r.district) ? r.district.join(" - ") : (r.district || t("common.notProvided"))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("commercialListings.location")}</span>
                    <span className="truncate max-w-[120px]" title={r.location ?? undefined}>{r.location || t("common.notProvided")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("commercialListings.rentAmount")}</span>
                    <span>{r.rentAmount || t("common.notProvided")}</span>
                  </div>
                  {r.amenities && r.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.amenities.slice(0, 4).map((a) => (
                        <span key={a.id} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {a.name}
                        </span>
                      ))}
                      {r.amenities.length > 4 && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          +{r.amenities.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  {t("commercialListings.contactDate")}: {r.contactDate || t("common.notProvided")}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r);
                      }}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(r);
                      }}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
        users={users.data ?? []}
        usersLoading={users.isLoading}
        amenities={amenities.data ?? []}
        readOnly={!canManage}
        submitting={submitting}
        title={t("commercialListings.add")}
        submitLabel={t("common.create")}
        onSubmit={handleCreate}
        onImagesChange={() => qc.invalidateQueries({ queryKey: ["commercial-listings"] })}
        onAddPartner={() => setPartnerDialogOpen(true)}
      />

      <CommercialListingDialog
        open={!!selected}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
        listing={listings.data?.find(l => l.id === selected?.id) || selected}
        partners={partners.data ?? []}
        partnersLoading={partners.isLoading}
        users={users.data ?? []}
        usersLoading={users.isLoading}
        amenities={amenities.data ?? []}
        readOnly={!canManage}
        submitting={submitting}
        title={canManage ? t("common.edit") : t("common.details")}
        submitLabel={canManage ? t("common.save") : t("common.close")}
        onSubmit={canManage ? handleUpdate : (e) => {
          e.preventDefault();
          setSelected(null);
        }}
        onImagesChange={() => qc.invalidateQueries({ queryKey: ["commercial-listings"] })}
        onAddUnit={() => setCreatingUnitFor(selected)}
        onImageZoom={(index) => {
          const listing = listings.data?.find(l => l.id === selected?.id) || selected;
          if (listing) openLightbox(listing, index);
        }}
        onAddPartner={() => setPartnerDialogOpen(true)}
      />

      <CommercialListingDialog
        open={!!creatingUnitFor}
        onOpenChange={(value) => {
          if (!value) setCreatingUnitFor(null);
        }}
        listing={unitInitialState}
        partners={partners.data ?? []}
        partnersLoading={partners.isLoading}
        users={users.data ?? []}
        usersLoading={users.isLoading}
        amenities={amenities.data ?? []}
        readOnly={!canManage}
        submitting={submitting}
        title={`${t("common.add")} ${t("common.unit")}`}
        submitLabel={t("common.create")}
        onSubmit={(e, publishing, contracts) => {
          handleCreate(e, publishing, contracts).then(() => setCreatingUnitFor(null));
        }}
        isUnit={true}
        onAddPartner={() => setPartnerDialogOpen(true)}
      />

      <PartnerDialog
        open={partnerDialogOpen}
        onOpenChange={setPartnerDialogOpen}
        partner={null}
        submitting={createPartnerMut.isPending}
        onSubmit={(vals) => createPartnerMut.mutate(vals)}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(value) => {
          if (!value) setDeleting(null);
        }}
        title={t("common.delete")}
        description={deleting?.ownerName || t("commercialListings.listing")}
        confirmLabel={t("common.delete")}
        destructive
        loading={deletingRecord}
        onConfirm={handleDelete}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <MediaLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
}

function CommercialListingDialog({
  open,
  onOpenChange,
  listing,
  partners,
  partnersLoading,
  users,
  usersLoading,
  amenities,
  readOnly,
  submitting,
  title,
  submitLabel,
  onSubmit,
  onAddUnit,
  onImagesChange,
  isUnit,
  onImageZoom,
  onAddPartner,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  listing: CommercialListing | null;
  partners: Partner[];
  partnersLoading: boolean;
  users: UserDto[];
  usersLoading: boolean;
  amenities: Amenity[];
  readOnly: boolean;
  submitting?: boolean;
  title: string;
  submitLabel: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>, publishing: PublishingState, contracts: BrokerageContractFormValue[]) => void | Promise<void>;
  onAddUnit?: () => void;
  onImagesChange?: () => void;
  isUnit?: boolean;
  onImageZoom?: (index: number) => void;
  onAddPartner?: () => void;
}) {
  const { t } = useTranslation();
  const dialogAuth = useAuth();
  const isAdmin = dialogAuth.hasRole("Admin");
  const [publishing, setPublishing] = useState<PublishingState>(() => buildPublishingState(listing));
  const [broker, setBroker] = useState<string>(listing?.broker ?? "");
  const [listingCategory, setListingCategory] = useState<ListingCategoryValue>(normalizeListingCategory(listing?.listingCategory));
  const [propertyStatus, setPropertyStatus] = useState<string>(listing?.propertyStatus ?? STATUS_AVAILABLE);
  const [listingType, setListingType] = useState<ListingTypeValue>(normalizeListingType(listing?.listingType));
  const [propertyType, setPropertyType] = useState<string>(listing?.propertyType ?? "");
  const [dealThrough, setDealThrough] = useState<string>(listing?.dealThrough ?? DEAL_THROUGH_OWNER);
  const [hasKey, setHasKey] = useState<boolean>(Boolean(listing?.hasKey));
  const [isOfficeListing, setIsOfficeListing] = useState<boolean>(Boolean(listing?.isOfficeListing));
  const [publicVisible, setPublicVisible] = useState<boolean>(Boolean(listing?.publicVisible));
  const [selectedCity, setSelectedCity] = useState(listing?.city ?? "");
  const [parentId, setParentId] = useState<number | null>(listing?.parentId ?? null);
  const [coordinates, setCoordinates] = useState<string>(listing?.coordinates ?? "");
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>(() => listing?.amenities?.map(a => a.id) ?? []);
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
      setPropertyType(listing?.propertyType ?? "");
      setDealThrough(listing?.dealThrough ?? DEAL_THROUGH_OWNER);
      setHasKey(Boolean(listing?.hasKey));
      setIsOfficeListing(Boolean(listing?.isOfficeListing));
      setPublicVisible(Boolean(listing?.publicVisible));
      setSelectedCity(listing?.city ?? "");
      setParentId(listing?.parentId ?? null);
      setCoordinates(listing?.coordinates ?? "");
      setSelectedAmenityIds(listing?.amenities?.map(a => a.id) ?? []);
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
          {parentId && <input type="hidden" name="parentId" value={parentId} />}
          <DateField id="contactDate" label={t("commercialListings.contactDate")} defaultValue={listing?.contactDate || todayLocal()} readOnly={readOnly} />
          <div className="space-y-2">
            <Label htmlFor="offerCode" className="text-xs font-medium">{t("commercialListings.offerCode")}</Label>
            {isAdmin ? (
              <Input id="offerCode" name="offerCode" defaultValue={listing?.offerCode ?? ""} readOnly={readOnly} className="mt-1" />
            ) : (
              <div className="mt-1 rounded-md border-2 border-gold/30 bg-gold/5 px-3 py-2 text-sm font-bold tracking-wide text-foreground">
                {listing?.offerCode || "—"}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="listingCategory" className="text-xs font-medium">{t("commercialListings.listingCategory")}</Label>
            <Select value={listingCategory} onValueChange={(v) => { setListingCategory(v as ListingCategoryValue); setPropertyType(""); }} disabled={readOnly}>
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
            <Label htmlFor="listingType" className="text-xs font-medium">{t("commercialListings.listingType")}</Label>
            <Select value={listingType} onValueChange={(v) => setListingType(v as ListingTypeValue)} disabled={readOnly}>
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
            <Label htmlFor="employee" className="text-xs font-medium">{t("common.employee")}</Label>
            <Select
              name="employee"
              defaultValue={listing?.employee ?? undefined}
              disabled={readOnly || usersLoading}
            >
              <SelectTrigger id="employee" className="mt-1">
                <SelectValue placeholder={t("common.employee")} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.username}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="broker" className="text-xs font-medium">{t("commercialListings.broker")}</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={broker || "none"} onValueChange={(value) => setBroker(value === "none" ? "" : value)} disabled={readOnly}>
                  <SelectTrigger id="broker" className="mt-1">
                    <SelectValue placeholder={partnersLoading ? t("common.loadingPartners") : t("common.selectPartner")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.notProvided")}</SelectItem>
                    {partnerOptions.map((partner) => (
                      <SelectItem key={partner.id} value={partner.fullName}>{partner.fullName}</SelectItem>
                    ))}
                    {broker && !hasCurrentBrokerInPartners && <SelectItem value={broker}>{broker}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mt-1 shrink-0"
                onClick={onAddPartner}
                title={t("common.add")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <input type="hidden" name="broker" value={broker} />
          </div>
          <div className="flex items-center gap-3">
            {/* Office Listing checkbox - only visible to admin/staff */}
            <OfficeListingCheckbox isOfficeListing={isOfficeListing} setIsOfficeListing={setIsOfficeListing} readOnly={readOnly} />
            <input type="hidden" name="isOfficeListing" value={String(isOfficeListing)} />
          </div>
          <div className="flex items-center gap-3">
            <PublicVisibleCheckbox publicVisible={publicVisible} setPublicVisible={setPublicVisible} readOnly={readOnly} />
            <input type="hidden" name="publicVisible" value={String(publicVisible)} />
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
          <PhoneField id="mobile1" label={t("commercialListings.mobile1")} defaultValue={listing?.mobile1} readOnly={readOnly} />
          <PhoneField id="mobile2" label={t("commercialListings.mobile2")} defaultValue={listing?.mobile2} readOnly={readOnly} />
          <TextField id="availableUnits" label={t("commercialListings.availableUnits")} defaultValue={listing?.availableUnits} readOnly={readOnly} type="number" min={0} />
          <TextField id="deedNumber" label={t("commercialListings.deedNumber")} defaultValue={listing?.deedNumber} readOnly={readOnly} />
          <div className="space-y-2">
            <Label htmlFor="propertyType" className="text-xs font-medium">{t("commercialListings.propertyType")}</Label>
            <Select value={propertyType} onValueChange={setPropertyType} disabled={readOnly}>
              <SelectTrigger id="propertyType" className="mt-1">
                <SelectValue placeholder={listingCategory ? t("common.choose") : t("commercialListings.chooseCategoryFirst")} />
              </SelectTrigger>
              <SelectContent>
                {getPropertyTypesByCategory(listingCategoryToArabic(listingCategory)).map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="propertyType" value={propertyType} />
          </div>
          <TextField id="roomsCount" label={t("commercialListings.roomsCount")} defaultValue={listing?.roomsCount} readOnly={readOnly} type="number" min={0} />
          <TextField id="buildingAge" label={t("commercialListings.buildingAge")} defaultValue={listing?.buildingAge} readOnly={readOnly} type="number" min={0} />
          <TextField id="hasElevator" label={t("commercialListings.hasElevator")} defaultValue={listing?.hasElevator} readOnly={readOnly} />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextareaField id="adText1" label={t("commercialListings.adText1")} defaultValue={listing?.adText1} readOnly={readOnly} className="sm:col-span-2" />
          <TextareaField id="adText2" label={t("commercialListings.adText2")} defaultValue={listing?.adText2} readOnly={readOnly} className="sm:col-span-2" />
          <TextField id="rentAmount" label={listingType === "Sale" ? t("commercialListings.salePrice") : t("commercialListings.rentAmount")} defaultValue={listing?.rentAmount} readOnly={readOnly} type="number" min={0} />
          <div className="space-y-2">
            <Label htmlFor="paymentType" className="text-xs font-medium">{t("commercialListings.paymentType")}</Label>
            <Select name="paymentType" defaultValue={listing?.paymentType ?? ""} disabled={readOnly}>
              <SelectTrigger id="paymentType" className="mt-1">
                <SelectValue placeholder={t("commercialListings.paymentType")} />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((p) => (
                  <SelectItem key={p} value={p}>{p === "كاش" ? t("common.cash") : p === "حوالة" ? t("common.transfer") : p === "سداد" ? t("common.repayment") : p === "مدى" ? t("common.mada") : p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <ComboboxField
              id="city"
              label={t("common.city")}
              defaultValue={listing?.city ?? ""}
              readOnly={readOnly}
              options={CITIES.map((c) => ({ value: c, label: c }))}
              onValueChange={setSelectedCity}
            />
          </div>
          <div className="space-y-2">
            <MultiComboboxField
              key={selectedCity}
              id="district"
              label={t("common.district")}
              defaultValue={listing?.district ?? null}
              readOnly={readOnly}
              disabled={!selectedCity}
              options={
                selectedCity
                  ? getDistricts(selectedCity).map((d) => ({ value: d, label: d }))
                  : []
              }
            />
          </div>
          <TextField id="location" label={t("commercialListings.location")} defaultValue={listing?.location} readOnly={readOnly} />
          <div className="space-y-3 sm:col-span-2">
            <TextField
              id="coordinates"
              label={t("commercialListings.coordinates")}
              defaultValue={listing?.coordinates}
              value={coordinates}
              onChange={setCoordinates}
              readOnly={readOnly}
            />
            <ListingLocationMap
              coordinates={coordinates}
              onCoordinatesChange={readOnly ? undefined : setCoordinates}
              editable={!readOnly}
            />
            {coordinates && (
              <Button
                asChild
                variant="outline"
                className="mt-4 w-full flex items-center justify-center gap-2"
              >
                <a
                  href={coordinates.startsWith("http") ? coordinates : `https://www.google.com/maps/search/?api=1&query=${coordinates}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin className="h-4 w-4 text-gold" />
                  {t("common.openInGoogleMaps")}
                </a>
              </Button>
            )}
          </div>
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
        <Label className="text-sm font-medium">{t("nav.amenities", { defaultValue: "Amenities" })}</Label>
        {amenities.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {amenities.map((amenity) => (
              <label key={amenity.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedAmenityIds.includes(amenity.id)}
                  onCheckedChange={(checked) => {
                    if (readOnly) return;
                    setSelectedAmenityIds((prev) =>
                      checked ? [...prev, amenity.id] : prev.filter((id) => id !== amenity.id)
                    );
                  }}
                  disabled={readOnly}
                />
                <span>{amenity.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{t("common.noData", { defaultValue: "No amenities available" })}</div>
        )}
        <input type="hidden" name="amenityIds" value={selectedAmenityIds.join(",")} />
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <TextareaField id="notes" label={t("common.notes")} defaultValue={listing?.notes} readOnly={readOnly} />
      </div>

      {listing?.id && (
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <CommercialListingImageManager
            listingId={listing.id}
            images={listing.images ?? []}
            onChange={onImagesChange ?? (() => {})}
            readOnly={readOnly}
            onImageZoom={onImageZoom}
          />
        </div>
      )}

      {normalizePropertyType(listing?.propertyType) === "Building" && !isUnit && (
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm font-medium">{t("common.units", { defaultValue: "Units" })}</Label>
            {onAddUnit && !readOnly && (
              <Button type="button" variant="outline" size="sm" onClick={onAddUnit}>
                <Plus className="me-1 h-4 w-4" />
                {t("common.add")} {t("common.unit", { defaultValue: "Unit" })}
              </Button>
            )}
          </div>
          {(listing?.units?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {listing?.units?.map(u => (
                <div key={u.id} className="flex items-center justify-between rounded-md border bg-card p-3 shadow-sm">
                  <div>
                    <div className="text-sm font-bold tracking-wide">{u.offerCode || "-"}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t(`propertyType.${u.propertyType}`)} &bull; {u.rentAmount ? `${u.rentAmount} SAR` : "-"} &bull; {u.propertyStatus}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-4">
              {t("common.noRecords", { defaultValue: "No records found" })}
            </div>
          )}
        </div>
      )}
    </FormDialog>
  );
}

function DateField({
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
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>

      <Input
        id={id}
        name={id}
        type="date"
        defaultValue={
          defaultValue ?? todayLocal()
        }
        readOnly={readOnly}
        disabled={readOnly}
        className={className ?? "mt-1 w-full [&::-webkit-calendar-picker-indicator]:ml-auto"}
      />
    </div>
  );
}


function TextField({
  id,
  label,
  defaultValue,
  value,
  onChange,
  readOnly,
  type = "text",
  min,
}: {
  id: string;
  label: string;
  defaultValue?: string | number | null;
  value?: string | number;
  onChange?: (value: string) => void;
  readOnly: boolean;
  type?: "text" | "number";
  min?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        min={min}
        defaultValue={value === undefined ? defaultValue ?? "" : undefined}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        disabled={readOnly}
        className="mt-1"
      />
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

function PublicVisibleCheckbox({ publicVisible, setPublicVisible, readOnly }: { publicVisible: boolean; setPublicVisible: (v: boolean) => void; readOnly: boolean; }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3">
      <Checkbox id="publicVisible" checked={publicVisible} onCheckedChange={(checked) => setPublicVisible(checked === true)} disabled={readOnly} />
      <div className="space-y-1">
        <Label htmlFor="publicVisible" className="text-sm font-medium">{t("commercialListings.publicVisible")}</Label>
      </div>
    </div>
  );
}

function OfficeListingCheckbox({ isOfficeListing, setIsOfficeListing, readOnly }: { isOfficeListing: boolean; setIsOfficeListing: (v: boolean) => void; readOnly: boolean; }) {
  const auth = useAuth();
  const { t } = useTranslation();
  // Show only for Admin or Staff
  const show = auth.isStaff;
  if (!show) return <></>;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3">
      <Checkbox id="isOfficeListing" checked={isOfficeListing} onCheckedChange={(checked) => setIsOfficeListing(checked === true)} disabled={readOnly} />
      <div className="space-y-1">
        <Label htmlFor="isOfficeListing" className="text-sm font-medium">{t("commercialListings.officeListing")}</Label>
      </div>
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
