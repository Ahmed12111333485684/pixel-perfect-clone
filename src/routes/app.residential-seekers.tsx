import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  resolveApiAssetUrl,
  createPartner,
  type ResidentialSeeker,
  type RequestPropertySuggestion,
  fetchPartners,
  type UserDto,
  type Partner,
  ApiError,
} from "@/lib/api";
import { PartnerDialog } from "@/components/partners/PartnerDialog";
import { useAuth } from "@/lib/auth";
import { todayLocal } from "@/lib/format";
import {
  PROPERTY_CATEGORIES,
  getPropertyTypesByCategory,
  localizePropertyType,
} from "@/lib/property-types";
import { NATIONALITIES } from "@/lib/nationalities";
import { PAYMENT_TYPES } from "@/lib/payment-types";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Building2, MapPin, Plus, Sparkles, LayoutGrid, List } from "lucide-react";
import { RiyalIcon } from "@/components/icons/RiyalIcon";
import { toast } from "sonner";
import { ComboboxField } from "@/components/form/ComboboxField";
import { MultiComboboxField } from "@/components/form/MultiComboboxField";
import { PhoneField } from "@/components/form/PhoneField";
import { CITIES, getDistricts } from "@/lib/locations";
import { FilterBar } from "@/components/search/FilterBar";
import { useUrlSearchState, matchesQuery, normalizeForSearch } from "@/lib/search";

export const Route = createFileRoute("/app/residential-seekers")({
  validateSearch: (search: Record<string, unknown>) => ({
    selected: search.selected ? Number(search.selected) : undefined,
    q: typeof search.q === "string" ? search.q : "",
    status: typeof search.status === "string" && search.status ? search.status : "all",
    listingType:
      typeof search.listingType === "string" && search.listingType ? search.listingType : "all",
    requestCategory:
      typeof search.requestCategory === "string" && search.requestCategory
        ? search.requestCategory
        : "all",
    city: typeof search.city === "string" ? search.city : "",
    district: typeof search.district === "string" ? search.district : "",
    page: typeof search.page === "number" && search.page > 0 ? search.page : 1,
    sortBy: typeof search.sortBy === "string" ? search.sortBy : "createdAt",
    sortDir: search.sortDir === "asc" ? "asc" : "desc",
  }),
  component: ResidentialSeekersPage,
});

interface ResidentialSeekersSearchResult {
  total: number;
  page: number;
  pageSize: number;
  items: ResidentialSeeker[];
}

const STATUS_DONE = "تم";
const STATUS_NOT_DONE = "لم يتم";

const RESIDENTIAL_FIELDS = [
  "serialNumber",
  "requestDate",
  "reviewDate",
  "status",
  "employee",
  "receiver",
  "sourceChannel",
  "listingType",
  "propertyType",
  "fullName",
  "mobile",
  "mobile2",
  "nationality",
  "profession",
  "familyCount",
  "requestDescription",
  "maxBudget",
  "paymentType",
  "preferredLocation",
  "city",
  "district",
  "notes",
  "requestCategory",
] as const;

type ResidentialFieldKey = (typeof RESIDENTIAL_FIELDS)[number];

function normalizeValue(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return JSON.stringify(value);
  return (value ?? "").trim();
}

function readFieldValue(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function buildResidentialPayload(fd: FormData, original?: ResidentialSeeker | null) {
  const payload: Record<string, unknown> = {};

  RESIDENTIAL_FIELDS.forEach((key) => {
    const value = readFieldValue(fd, key);
    if (!original || value !== normalizeValue(original[key as ResidentialFieldKey])) {
      payload[key] = value;
    }
  });

  const districtRaw = fd.get("district");
  if (districtRaw) {
    try {
      payload.district = JSON.parse(String(districtRaw));
    } catch {
      payload.district = [String(districtRaw)];
    }
  }

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

  const [urlState, setUrlState] = useUrlSearchState(Route, {
    selected: undefined as number | undefined,
    q: "",
    status: "all",
    listingType: "all",
    requestCategory: "all",
    city: "",
    district: "",
    page: 1,
    sortBy: "createdAt",
    sortDir: "desc" as "asc" | "desc",
  });
  const { q, status, listingType, requestCategory, city, district, page, sortBy, sortDir } =
    urlState;
  const [pageSize] = useState(100);
  const setQ = (value: string) => setUrlState({ q: value, page: 1 });
  const setStatus = (value: string) => setUrlState({ status: value, page: 1 });
  const setListingType = (value: string) => setUrlState({ listingType: value, page: 1 });
  const setRequestCategory = (value: string) => setUrlState({ requestCategory: value, page: 1 });
  const setCity = (value: string) => setUrlState({ city: value, district: "", page: 1 });
  const setDistrict = (value: string) => setUrlState({ district: value, page: 1 });
  const setSortBy = (value: string) => setUrlState({ sortBy: value, page: 1 });
  const setSortDir = (value: "asc" | "desc") => setUrlState({ sortDir: value, page: 1 });
  const setPage = (value: number | ((current: number) => number)) =>
    setUrlState((prev) => ({
      page: typeof value === "function" ? value(prev.page) : Math.max(1, value),
    }));

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<ResidentialSeeker | null>(null);
  const [deleting, setDeleting] = useState<ResidentialSeeker | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);
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
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success(t("common.success"));
      setPartnerDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const hasAccess =
    auth.hasRole("Admin") ||
    auth.isPartner ||
    auth.user?.screenPermissions.includes("/app/residential-seekers");
  const canManage = auth.isStaff || auth.isPartner;
  const isAdmin = auth.hasRole("Admin");

  // Fetch all seekers (paginated client-side) so we can filter locally on every facet.
  const seekers = useQuery<ResidentialSeeker[]>({
    queryKey: ["residential-seekers", "all"],
    queryFn: async () => {
      const fetchPage = (pageNumber: number) =>
        api<ResidentialSeekersSearchResult>("/residential-seekers", {
          query: { page: pageNumber, pageSize: 100 },
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
    placeholderData: (prev) => prev,
  });

  const { selected: selectedId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!selectedId || autoOpenedRef.current || !seekers.data) return;
    const match = seekers.data.find((r) => r.id === selectedId);
    if (match) {
      autoOpenedRef.current = true;
      setSelected(match);
      navigate({
        search: (prev: Record<string, unknown>) => ({ ...prev, selected: undefined }),
        replace: true,
      });
      requestAnimationFrame(() => {
        document.querySelector(`[data-seeker-id="${match.id}"]`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }
  }, [selectedId, seekers.data, navigate]);

  const suggestionsQuery = useQuery({
    queryKey: ["residential-seeker-suggestions", selected?.id],
    queryFn: () =>
      api<RequestPropertySuggestion[]>(
        `/api/residential-seekers/${selected?.id}/property-suggestions`,
      ),
    enabled: !!selected?.id,
  });

  const users = useQuery({
    queryKey: ["users", "lookup"],
    queryFn: () => api<UserDto[]>("/users"),
    enabled: hasAccess,
  });

  const handleReset = () => {
    setQ("");
    setStatus("all");
    setListingType("all");
    setRequestCategory("all");
    setCity("");
    setDistrict("");
    setPage(1);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildResidentialPayload(fd);
      await api<ResidentialSeeker>("/residential-seekers", { method: "POST", body: payload });
      toast.success(t("common.created"));
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["residential-seekers"] });
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.detail
          ? error.detail
          : error instanceof Error
            ? error.message
            : t("common.error"),
      );
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
      await api<ResidentialSeeker>(`/api/residential-seekers/${selected.id}`, {
        method: "PUT",
        body: payload,
      });
      toast.success(t("common.updated"));
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["residential-seekers"] });
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.detail
          ? error.detail
          : error instanceof Error
            ? error.message
            : t("common.error"),
      );
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setDeletingRecord(false);
    }
  };

  const statusTone = (value?: string | null) => {
    const normalized = normalizeValue(value);
    if (normalized === STATUS_DONE) return "success" as const;
    if (normalized === STATUS_NOT_DONE) return "warning" as const;
    return "neutral" as const;
  };

  const statusLabel = (value?: string | null) => {
    const normalized = normalizeValue(value);
    if (!normalized) return t("common.notProvided");
    if (normalized === STATUS_DONE) return t("residentialSeekers.statusDone");
    if (normalized === STATUS_NOT_DONE) return t("residentialSeekers.statusNotDone");
    return value ?? t("common.notProvided");
  };

  const maxBudgetLabelFor = (value?: string | null) =>
    normalizeValue(value).toLowerCase() === "rental"
      ? t("residentialSeekers.maxRentalBudget")
      : t("residentialSeekers.maxBudget");

  const columns: Column<ResidentialSeeker>[] = [
    {
      key: "serialNumber",
      header: t("residentialSeekers.serialNumber"),
      cell: (r) => (
        <span className="font-mono font-medium">{r.serialNumber || t("common.notProvided")}</span>
      ),
    },
    {
      key: "requestDate",
      header: t("residentialSeekers.requestDate"),
      cell: (r) => r.requestDate || t("common.notProvided"),
      sortable: true,
    },
    {
      key: "reviewDate",
      header: t("residentialSeekers.reviewDate"),
      cell: (r) => r.reviewDate || t("common.notProvided"),
      sortable: true,
    },
    {
      key: "status",
      header: t("residentialSeekers.status"),
      cell: (r) => <StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge>,
      sortable: true,
    },
    {
      key: "fullName",
      header: t("residentialSeekers.fullName"),
      cell: (r) => <span className="font-medium">{r.fullName || t("common.notProvided")}</span>,
      sortable: true,
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
      cell: (r) =>
        r.requestDescription ? truncateText(r.requestDescription, 60) : t("common.notProvided"),
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
      cell: (r) =>
        r.listingType
          ? t(`listingType.${r.listingType}`, { defaultValue: r.listingType })
          : t("common.notProvided"),
    },
    {
      key: "propertyType",
      header: t("residentialSeekers.propertyType"),
      cell: (r) =>
        r.propertyType ? localizePropertyType(t, r.propertyType) : t("common.notProvided"),
    },
    {
      key: "preferredLocation",
      header: t("residentialSeekers.preferredLocation"),
      cell: (r) => r.preferredLocation || t("common.notProvided"),
    },
    {
      key: "city",
      header: t("common.city"),
      cell: (r) => r.city || t("common.notProvided"),
    },
    {
      key: "district",
      header: t("common.district"),
      cell: (r) =>
        Array.isArray(r.district) ? r.district.join(" - ") : r.district || t("common.notProvided"),
    },
    {
      key: "employee",
      header: t("residentialSeekers.employee"),
      cell: (r) => r.employee || t("common.notProvided"),
      sortable: true,
    },
  ];

  const filteredSeekers = useMemo(() => {
    const items = seekers.data ?? [];
    const cityMatch = (r: ResidentialSeeker) =>
      !city || normalizeForSearch(r.city) === normalizeForSearch(city);
    const districtMatch = (r: ResidentialSeeker) => {
      if (!district) return true;
      const normalizedDistrict = normalizeForSearch(district);
      return (
        Array.isArray(r.district) &&
        r.district.some((d) => normalizeForSearch(d) === normalizedDistrict)
      );
    };

    const filtered = items.filter((r) => {
      const qMatch = matchesQuery(
        [
          r.serialNumber,
          r.fullName,
          r.mobile,
          r.mobile2,
          r.preferredLocation,
          r.city,
          r.district,
          r.requestDescription,
          r.notes,
          r.listingType,
          r.propertyType,
        ],
        q,
      );
      const statusMatch = status === "all" || r.status === status;
      const listingTypeMatch =
        listingType === "all" ||
        normalizeForSearch(r.listingType) === normalizeForSearch(listingType);
      const requestCategoryMatch =
        requestCategory === "all" ||
        normalizeForSearch(r.requestCategory) === normalizeForSearch(requestCategory);
      return (
        qMatch &&
        statusMatch &&
        listingTypeMatch &&
        requestCategoryMatch &&
        cityMatch(r) &&
        districtMatch(r)
      );
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let av: string;
      let bv: string;
      switch (sortBy) {
        case "requestDate":
          av = a.requestDate ?? "";
          bv = b.requestDate ?? "";
          break;
        case "reviewDate":
          av = a.reviewDate ?? "";
          bv = b.reviewDate ?? "";
          break;
        case "fullName":
          av = a.fullName ?? "";
          bv = b.fullName ?? "";
          break;
        case "status":
          av = a.status ?? "";
          bv = b.status ?? "";
          break;
        case "employee":
          av = a.employee ?? "";
          bv = b.employee ?? "";
          break;
        default:
          av = a.createdAt ?? "";
          bv = b.createdAt ?? "";
          break;
      }
      if (av === bv) return 0;
      return av.localeCompare(bv, "ar") * dir;
    });
  }, [seekers.data, q, status, listingType, requestCategory, city, district, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSeekers.length / pageSize));

  const visibleSeekers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSeekers.slice(start, start + pageSize);
  }, [filteredSeekers, page, pageSize]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

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
        title={t("residentialSeekers.pageTitle")}
        subtitle={t("residentialSeekers.pageSubtitle")}
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="me-1 h-4 w-4" />
              {t("common.add")}
            </Button>
          ) : undefined
        }
      />

      <FilterBar
        city={city}
        district={district}
        onCityChange={setCity}
        onDistrictChange={setDistrict}
        onReset={handleReset}
        activeCount={
          [
            q,
            status !== "all" ? status : "",
            listingType !== "all" ? listingType : "",
            requestCategory !== "all" ? requestCategory : "",
            city,
            district,
          ].filter(Boolean).length
        }
        search={
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="q" className="text-xs font-medium">
              {t("common.search")}
            </Label>
            <Input
              id="q"
              placeholder={t("residentialSeekers.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
        }
        facets={[
          {
            label: t("residentialSeekers.status"),
            value: status,
            onValueChange: setStatus,
            options: [
              { value: STATUS_NOT_DONE, label: t("residentialSeekers.statusNotDone") },
              { value: STATUS_DONE, label: t("residentialSeekers.statusDone") },
            ],
          },
          {
            label: t("residentialSeekers.listingType"),
            value: listingType,
            onValueChange: setListingType,
            options: [
              { value: "Rental", label: t("listingType.Rental") },
              { value: "Sale", label: t("listingType.Sale") },
            ],
          },
          {
            label: t("residentialSeekers.requestCategory"),
            value: requestCategory,
            onValueChange: setRequestCategory,
            options: PROPERTY_CATEGORIES.map((cat) => ({
              value: cat,
              label: t(`listingCategory.${cat === "سكني" ? "Residential" : "Commercial"}`),
            })),
          },
          {
            label: t("residentialSeekers.sortBy"),
            value: `${sortBy}-${sortDir}`,
            allowAll: false,
            onValueChange: (val) => {
              const [k, d] = val.split("-");
              setSortBy(k);
              setSortDir(d as "asc" | "desc");
            },
            options: [
              { value: "createdAt-desc", label: t("residentialSeekers.sortNewest") },
              { value: "createdAt-asc", label: t("residentialSeekers.sortOldest") },
              { value: "requestDate-desc", label: t("residentialSeekers.sortRequestDateNewest") },
              { value: "requestDate-asc", label: t("residentialSeekers.sortRequestDateOldest") },
              { value: "fullName-asc", label: t("residentialSeekers.sortNameAsc") },
              { value: "fullName-desc", label: t("residentialSeekers.sortNameDesc") },
            ],
          },
        ]}
      />

      <div className="mb-4 flex items-center justify-end">
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

      {seekers.isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">
          {t("common.loading", { defaultValue: "Loading..." })}
        </div>
      ) : seekers.error ? (
        <div className="rounded-xl border border-dashed border-destructive/40 p-8 text-center text-destructive">
          {t("common.error", { defaultValue: "An error occurred." })}
        </div>
      ) : filteredSeekers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          {t("common.noData", { defaultValue: "No data found." })}
        </div>
      ) : viewMode === "table" ? (
        <DataTable
          columns={columns}
          rows={visibleSeekers}
          loading={seekers.isLoading}
          error={seekers.error}
          rowKey={(r) => r.id}
          onEdit={canManage ? (row) => setSelected(row) : undefined}
          onDelete={canManage ? (row) => setDeleting(row) : undefined}
          onRowClick={auth.isPartner ? undefined : (row) => setSelected(row)}
          sortKey={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleSeekers.map((r) => (
            <div
              key={r.id}
              data-seeker-id={r.id}
              className="group cursor-pointer flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => setSelected(r)}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div
                    className="font-medium truncate"
                    title={r.fullName || t("common.notProvided")}
                  >
                    {r.fullName || t("common.notProvided")}
                  </div>
                  <StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("residentialSeekers.propertyType")}
                    </span>
                    <span>
                      {r.propertyType
                        ? localizePropertyType(t, r.propertyType)
                        : t("common.notProvided")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("residentialSeekers.listingType")}
                    </span>
                    <span>
                      {r.listingType
                        ? t(`listingType.${r.listingType}`, { defaultValue: r.listingType })
                        : t("common.notProvided")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("residentialSeekers.preferredLocation")}
                    </span>
                    <span
                      className="truncate max-w-[120px]"
                      title={r.preferredLocation ?? undefined}
                    >
                      {r.preferredLocation || t("common.notProvided")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("common.city")}</span>
                    <span>{r.city || t("common.notProvided")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("common.district")}</span>
                    <span>
                      {Array.isArray(r.district)
                        ? r.district.join(" - ")
                        : r.district || t("common.notProvided")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {maxBudgetLabelFor(r.listingType)}
                    </span>
                    <span>{r.maxBudget || t("common.notProvided")}</span>
                  </div>
                  {r.requestDescription && (
                    <div className="pt-2">
                      <p
                        className="text-xs text-muted-foreground line-clamp-2"
                        title={r.requestDescription}
                      >
                        {r.requestDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-1 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    {t("residentialSeekers.requestDate")}:{" "}
                    {r.requestDate || t("common.notProvided")}
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
                <div>
                  {t("residentialSeekers.reviewDate")}: {r.reviewDate || t("common.notProvided")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredSeekers.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("common.of", { defaultValue: "Showing" })} {(page - 1) * pageSize + 1}
            {" - "}
            {Math.min(page * pageSize, filteredSeekers.length)}{" "}
            {t("common.of", { defaultValue: "of" })} {filteredSeekers.length}
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
        users={users.data ?? []}
        usersLoading={users.isLoading}
        readOnly={!canManage}
        submitting={submitting}
        title={`${t("common.add")} ${t("nav.residentialSeekers")}`}
        submitLabel={t("common.create")}
        onSubmit={handleCreate}
        onAddPartner={() => setPartnerDialogOpen(true)}
        isAdmin={isAdmin}
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
        users={users.data ?? []}
        usersLoading={users.isLoading}
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
        onAddPartner={() => setPartnerDialogOpen(true)}
        isAdmin={isAdmin}
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
  users,
  usersLoading,
  readOnly,
  submitting,
  title,
  submitLabel,
  onSubmit,
  onAddPartner,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  seeker: ResidentialSeeker | null;
  suggestions: RequestPropertySuggestion[];
  suggestionsLoading: boolean;
  suggestionsError: unknown;
  users: UserDto[];
  usersLoading: boolean;
  readOnly: boolean;
  submitting?: boolean;
  title: string;
  submitLabel: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onAddPartner?: () => void;
  isAdmin: boolean;
}) {
  const { t } = useTranslation();
  const [listingType, setListingType] = useState(seeker?.listingType ?? "Rental");
  const [requestCategory, setRequestCategory] = useState(seeker?.requestCategory ?? "سكني");
  const [propertyType, setPropertyType] = useState(seeker?.propertyType ?? "");
  const [selectedCity, setSelectedCity] = useState(seeker?.city ?? "");
  const maxBudgetLabel =
    listingType === "Rental"
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
          {isAdmin ? (
            <TextField
              id="serialNumber"
              label={t("residentialSeekers.serialNumber")}
              defaultValue={seeker?.serialNumber}
              readOnly={readOnly}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="serialNumber" className="text-xs font-medium">
                {t("residentialSeekers.serialNumber")}
              </Label>
              <div className="mt-1 rounded-md border-2 border-gold/30 bg-gold/5 px-3 py-2 text-sm font-bold tracking-wide text-foreground">
                {seeker?.serialNumber || "—"}
              </div>
            </div>
          )}
          <DateField
            id="requestDate"
            label={t("residentialSeekers.requestDate")}
            defaultValue={seeker?.requestDate || todayLocal()}
            readOnly={readOnly}
            className="mt-1 w-full [color-scheme:light] [&::-webkit-calendar-picker-indicator]:ml-auto"
          />
          <DateField
            id="reviewDate"
            label={t("residentialSeekers.reviewDate")}
            defaultValue={seeker?.reviewDate}
            readOnly={readOnly}
            className="mt-1 w-full [color-scheme:light] [&::-webkit-calendar-picker-indicator]:ml-auto"
          />
          <SelectField
            id="status"
            label={t("residentialSeekers.status")}
            defaultValue={seeker?.status ?? STATUS_NOT_DONE}
            readOnly={readOnly}
            options={[
              { value: STATUS_NOT_DONE, label: STATUS_NOT_DONE },
              { value: STATUS_DONE, label: STATUS_DONE },
            ]}
          />

          <SelectField
            id="employee"
            label={t("common.employee")}
            defaultValue={seeker?.employee ?? ""}
            readOnly={readOnly || usersLoading}
            options={users.map((u) => ({ value: u.username, label: u.username }))}
          />
          <SelectField
            id="receiver"
            label={t("residentialSeekers.receiver")}
            defaultValue={seeker?.receiver ?? ""}
            readOnly={readOnly || usersLoading}
            options={users.map((u) => ({ value: u.username, label: u.username }))}
          />
          {readOnly ? (
            <TextField
              id="sourceChannel"
              label={t("residentialSeekers.sourceChannel")}
              defaultValue={seeker?.sourceChannel}
              readOnly={readOnly}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="sourceChannel" className="text-xs font-medium">
                {t("residentialSeekers.sourceChannel")}
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <PartnersSelect defaultValue={seeker?.sourceChannel} />
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
            </div>
          )}
        </div>
      </div>

      {/* --> Listing Info */}
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
            id="requestCategory"
            label={t("residentialSeekers.requestCategory")}
            defaultValue={requestCategory}
            readOnly={readOnly}
            onValueChange={(v) => {
              setRequestCategory(v);
              setPropertyType("");
            }}
            options={PROPERTY_CATEGORIES.map((cat) => ({
              value: cat,
              label: t(`listingCategory.${cat === "سكني" ? "Residential" : "Commercial"}`),
            }))}
          />
          <div key={requestCategory}>
            <SelectField
              id="propertyType"
              label={t("residentialSeekers.propertyType")}
              defaultValue={propertyType}
              readOnly={readOnly || !requestCategory}
              onValueChange={setPropertyType}
              options={getPropertyTypesByCategory(requestCategory).map((type) => ({
                value: type,
                label: localizePropertyType(t, type),
              }))}
            />
          </div>
          {listingType === "Rental" && requestCategory === "تجاري" && (
            <>
              <TextField
                id="activity"
                label={t("residentialSeekers.activity")}
                defaultValue={seeker?.activity}
                readOnly={readOnly}
              />
              <TextField
                id="requiredSpace"
                label={t("residentialSeekers.requiredSpace")}
                defaultValue={seeker?.requiredSpace}
                readOnly={readOnly}
                type="number"
                min={0}
              />
            </>
          )}
        </div>
      </div>

      {/* --> Personal Info */}
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="fullName"
            label={t("residentialSeekers.fullName")}
            defaultValue={seeker?.fullName}
            readOnly={readOnly}
          />
          <PhoneField
            id="mobile"
            label={t("common.mobileNumber")}
            defaultValue={seeker?.mobile}
            readOnly={readOnly}
          />
          <PhoneField
            id="mobile2"
            label={t("common.secondMobileNumber")}
            defaultValue={seeker?.mobile2}
            readOnly={readOnly}
          />
          <ComboboxField
            id="nationality"
            label={t("residentialSeekers.nationality")}
            defaultValue={seeker?.nationality ?? "سعودي"}
            readOnly={readOnly}
            options={NATIONALITIES.map((n) => ({
              value: n,
              label: n,
            }))}
          />
          {listingType === "Rental" && requestCategory === "سكني" && (
            <>
              <TextField
                id="profession"
                label={t("residentialSeekers.profession")}
                defaultValue={seeker?.profession}
                readOnly={readOnly}
              />
              <TextField
                id="familyCount"
                label={t("residentialSeekers.familyCount")}
                defaultValue={seeker?.familyCount}
                readOnly={readOnly}
                type="number"
                min={1}
              />
            </>
          )}
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
          <TextField
            id="maxBudget"
            label={maxBudgetLabel}
            defaultValue={seeker?.maxBudget}
            readOnly={readOnly}
            type="number"
          />
          <SelectField
            id="paymentType"
            label={t("residentialSeekers.paymentType")}
            defaultValue={seeker?.paymentType ?? ""}
            readOnly={readOnly}
            options={
              listingType === "Rental"
                ? [{ value: "دفعات", label: "دفعات" }]
                : PAYMENT_TYPES.map((p) => ({
                    value: p,
                    label: p === "كاش" ? t("paymentTypes.cash") : t("paymentTypes.finance"),
                  }))
            }
          />
          <TextField
            id="preferredLocation"
            label={t("residentialSeekers.preferredLocation")}
            defaultValue={seeker?.preferredLocation}
            readOnly={readOnly}
          />
          <ComboboxField
            id="city"
            label={t("common.city")}
            defaultValue={seeker?.city ?? ""}
            readOnly={readOnly}
            options={CITIES.map((c) => ({ value: c, label: c }))}
            onValueChange={setSelectedCity}
          />
          <MultiComboboxField
            key={selectedCity}
            id="district"
            label={t("common.district")}
            defaultValue={seeker?.district ?? []}
            readOnly={readOnly}
            disabled={!selectedCity}
            options={
              selectedCity ? getDistricts(selectedCity).map((d) => ({ value: d, label: d })) : []
            }
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <TextareaField
          id="notes"
          label={t("common.notes")}
          defaultValue={seeker?.notes}
          readOnly={readOnly}
        />
      </div>

      {seeker && (
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                {t("common.suggestions", { defaultValue: "Suggested properties" })}
              </p>
              <p className="text-xs text-muted-foreground">{t("common.autoMatched")}</p>
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
                <div
                  key={property.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
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
                              {t("common.match")} {property.score}
                            </span>
                          </div>
                          <div className="mt-1 truncate font-medium">{property.name}</div>
                          <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{property.address}</span>
                          </div>
                        </div>

                        <Badge variant="outline">
                          {t(`listingType.${property.listingType}`, {
                            defaultValue: property.listingType,
                          })}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{localizePropertyType(t, property.type)}</span>
                        {property.region && <span>{property.region}</span>}
                        {property.city && <span>{property.city}</span>}
                        {property.district && <span>{property.district}</span>}
                        {(property.rentPrice ?? property.salePrice) != null && (
                          <span className="inline-flex items-center gap-1">
                            <RiyalIcon className="h-3.5 w-3.5" />
                            {(property.rentPrice ?? property.salePrice)!.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {property.reasons.slice(0, 3).map((reason, index) => {
                          const args = reason.args ? { ...reason.args } : undefined;
                          if (args && args.listingType) {
                            args.listingType = t(`requestType.${args.listingType}`, {
                              defaultValue: args.listingType,
                            });
                          }
                          if (args && args.propertyType) {
                            args.propertyType = localizePropertyType(t, args.propertyType);
                          }

                          return (
                            <Badge
                              key={`${reason.key}-${index}`}
                              variant="outline"
                              className="text-[11px]"
                            >
                              {t(`suggestions.reasons.${reason.key}`, args || {})}
                            </Badge>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/app/listings"
                            search={{ selected: property.id }}
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
  type = "text",
  min,
}: {
  id: string;
  label: string;
  defaultValue?: string | number | null;
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
        defaultValue={defaultValue ?? ""}
        readOnly={readOnly}
        disabled={readOnly}
        className="mt-1"
      />
    </div>
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
        defaultValue={defaultValue ?? todayLocal()}
        readOnly={readOnly}
        disabled={readOnly}
        className={className ?? "mt-1 w-full [&::-webkit-calendar-picker-indicator]:ml-auto"}
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
      <Select
        name={id}
        defaultValue={defaultValue}
        disabled={readOnly}
        onValueChange={onValueChange}
      >
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
        <option key={p.id} value={p.fullName}>
          {p.fullName}
        </option>
      ))}
    </select>
  );
}
