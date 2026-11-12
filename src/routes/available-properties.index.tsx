import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { api, resolveApiAssetUrl, type PublicListing } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MediaPreview } from "@/components/MediaPreview";
import { formatDate } from "@/lib/format";
import { parseAmount, normalizeForSearch, matchesQuery, useUrlSearchState } from "@/lib/search";
import { getPropertyTypeFilterOptions, matchesPropertyType } from "@/lib/property-types";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { usePageSize } from "@/hooks/use-page-size";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { FilterBar } from "@/components/search/FilterBar";
import { QuickFilterBar } from "@/components/search/QuickFilterBar";
import {
  Building2,
  MapPin,
  Home,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Tag,
  Layers,
  DoorOpen,
  CalendarDays,
} from "lucide-react";
import { RiyalIcon } from "@/components/icons/RiyalIcon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LISTING_TYPE_RENTAL = "Rental";
const LISTING_TYPE_SALE = "Sale";
const LISTING_CATEGORY_RESIDENTIAL = "Residential";
const LISTING_CATEGORY_COMMERCIAL = "Commercial";
// Investment is a virtual category: commercial listings that are rented
// (mirrors the legacy Arabic "استثماري" listing type / the RB series).
const LISTING_CATEGORY_INVESTMENT = "Investment";
const FILTER_ALL = "all";

function listingCategoryToArabic(category: string): string {
  return category === LISTING_CATEGORY_RESIDENTIAL ? "سكني" : "تجاري";
}

/**
 * True when a stored listing type means "for sale". Lead-approved listings
 * historically stored "ForSale" rather than "Sale", so both spellings (and the
 * Arabic equivalents) are accepted.
 */
function isSaleListing(value: string | null | undefined): boolean {
  const normalized = normalizeForSearch(value);
  return (
    normalized === normalizeForSearch(LISTING_TYPE_SALE) ||
    normalized === normalizeForSearch("ForSale") ||
    normalized === normalizeForSearch("بيع") ||
    normalized === normalizeForSearch("للبيع") ||
    normalized === normalizeForSearch("تمليك")
  );
}

function matchesListingType(value: string | null | undefined, selected: string): boolean {
  if (!selected || selected === FILTER_ALL) return true;
  // Only "for sale" is treated as sale; every other value (including the
  // legacy "ForSale"/Arabic spellings) is treated as rental by default.
  return selected === LISTING_TYPE_SALE ? isSaleListing(value) : !isSaleListing(value);
}

function matchesListingCategory(
  value: string | null | undefined,
  selected: string,
  listingType: string | null | undefined,
): boolean {
  if (!selected || selected === FILTER_ALL) return true;
  const normalized = normalizeForSearch(value);
  const isResidential =
    normalized === normalizeForSearch(LISTING_CATEGORY_RESIDENTIAL) ||
    normalized === normalizeForSearch("سكني");
  // A missing category is treated as commercial (the historical default).
  const isCommercial =
    !normalized ||
    normalized === normalizeForSearch(LISTING_CATEGORY_COMMERCIAL) ||
    normalized === normalizeForSearch("تجاري") ||
    normalized === normalizeForSearch("تجارى");

  if (selected === LISTING_CATEGORY_RESIDENTIAL) return isResidential;
  // Investment = commercial rental (covers the legacy "استثماري" type, which
  // is not a sale type, so it is treated as a rental here).
  if (selected === LISTING_CATEGORY_INVESTMENT) {
    return isCommercial && !isSaleListing(listingType);
  }
  return isCommercial;
}

export const Route = createFileRoute("/available-properties/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    q?: string;
    listingType?: string;
    listingCategory?: string;
    propertyType?: string;
    roomCount?: string;
    city?: string;
    district?: string;
    minBudget?: string;
    maxBudget?: string;
    page?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  } => ({
    q: typeof search.q === "string" ? search.q : "",
    listingType:
      typeof search.listingType === "string" && search.listingType
        ? search.listingType
        : FILTER_ALL,
    listingCategory:
      typeof search.listingCategory === "string" && search.listingCategory
        ? search.listingCategory
        : FILTER_ALL,
    propertyType:
      typeof search.propertyType === "string" && search.propertyType
        ? search.propertyType
        : FILTER_ALL,
    roomCount:
      typeof search.roomCount === "string" && search.roomCount ? search.roomCount : FILTER_ALL,
    city: typeof search.city === "string" ? search.city : "",
    district: typeof search.district === "string" ? search.district : "",
    minBudget: typeof search.minBudget === "string" ? search.minBudget : "",
    maxBudget: typeof search.maxBudget === "string" ? search.maxBudget : "",
    page: typeof search.page === "number" && search.page > 0 ? search.page : 1,
    sortBy: typeof search.sortBy === "string" ? search.sortBy : "createdAt",
    sortDir: search.sortDir === "asc" ? "asc" : "desc",
  }),
  head: () => ({
    meta: [
      { title: "Available Properties — Nour Consultancy" },
      {
        name: "description",
        content: "Browse available properties with their sale and rent prices.",
      },
    ],
  }),
  component: AvailablePropertiesPage,
});

function AvailablePropertiesPage() {
  const { t } = useTranslation();

  const [urlState, setUrlState] = useUrlSearchState(Route, {
    q: "",
    listingType: FILTER_ALL,
    listingCategory: FILTER_ALL,
    propertyType: FILTER_ALL,
    roomCount: FILTER_ALL,
    city: "",
    district: "",
    minBudget: "",
    maxBudget: "",
    page: 1,
    sortBy: "createdAt",
    sortDir: "desc" as "asc" | "desc",
  });
  const {
    q,
    listingType,
    listingCategory,
    propertyType,
    roomCount,
    city,
    district,
    minBudget,
    maxBudget,
    page,
    sortBy,
    sortDir,
  } = urlState;
  const [pageSize, setPageSize] = usePageSize();

  const {
    data: listings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-listings"],
    queryFn: () => api<PublicListing[]>("/public/listings", { anonymous: true }),
  });

  // --- debounced search input ---
  const [inputQ, setInputQ] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setInputQ(q);
  }, [q]);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );
  const setInputQDebounced = (value: string) => {
    setInputQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setUrlState({ q: value, page: 1 }), 250);
  };
  const deferredQ = useDeferredValue(inputQ);
  // -------------------------------

  const setListingType = (value: string) => setUrlState({ listingType: value, page: 1 });
  const setPropertyType = (value: string) => setUrlState({ propertyType: value, page: 1 });
  const setListingCategory = (value: string) => {
    // FacetSelect reports "All" as "", so both "" and "all" mean "no category".
    const category = !value || value === FILTER_ALL ? null : listingCategoryToArabic(value);
    const options = getPropertyTypeFilterOptions(category);
    setUrlState({
      listingCategory: value,
      propertyType:
        propertyType !== FILTER_ALL && !options.includes(propertyType) ? FILTER_ALL : propertyType,
      page: 1,
    });
  };
  const setRoomCount = (value: string) => setUrlState({ roomCount: value, page: 1 });
  const setCity = (value: string) => setUrlState({ city: value, district: "", page: 1 });
  const setDistrict = (value: string) => setUrlState({ district: value, page: 1 });
  const setMinBudget = (value: string) => setUrlState({ minBudget: value, page: 1 });
  const setMaxBudget = (value: string) => setUrlState({ maxBudget: value, page: 1 });
  const setSortBy = (value: string) => setUrlState({ sortBy: value, page: 1 });
  const setSortDir = (value: "asc" | "desc") => setUrlState({ sortDir: value, page: 1 });
  const setPage = (value: number | ((current: number) => number)) =>
    setUrlState((prev) => ({
      page: typeof value === "function" ? value(prev.page) : Math.max(1, value),
    }));

  const handleReset = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputQ("");
    setUrlState({
      q: "",
      listingType: FILTER_ALL,
      listingCategory: FILTER_ALL,
      propertyType: FILTER_ALL,
      roomCount: FILTER_ALL,
      city: "",
      district: "",
      minBudget: "",
      maxBudget: "",
      page: 1,
      sortBy: "createdAt",
      sortDir: "desc",
    });
  };

  const propertyTypeOptions = useMemo(
    () =>
      getPropertyTypeFilterOptions(
        !listingCategory || listingCategory === FILTER_ALL
          ? null
          : listingCategoryToArabic(listingCategory),
      ),
    [listingCategory],
  );

  const filtered = useMemo(() => {
    const items = listings ?? [];
    const normalizedCity = normalizeForSearch(city);
    const normalizedDistrict = normalizeForSearch(district);
    const min = parseAmount(minBudget);
    const max = parseAmount(maxBudget);

    return items.filter((listing) => {
      const qMatch = matchesQuery(
        [
          listing.offerCode,
          listing.adText1,
          listing.adText2,
          listing.listingType,
          listing.listingCategory,
          listing.propertyType,
          listing.propertyStatus,
          listing.city,
          listing.district,
          listing.location,
          listing.roomsCount,
          listing.paymentType,
          ...(listing.amenities ?? []).map((amenity) => amenity.name),
        ],
        deferredQ,
      );

      const listingTypeMatch = matchesListingType(listing.listingType, listingType);
      const listingCategoryMatch = matchesListingCategory(
        listing.listingCategory,
        listingCategory,
        listing.listingType,
      );
      const propertyTypeMatch = matchesPropertyType(listing.propertyType, propertyType);
      const roomCountMatch =
        roomCount === FILTER_ALL ||
        (roomCount === "6"
          ? Number(listing.roomsCount ?? "0") >= 6
          : listing.roomsCount === roomCount);

      const cityMatch = !normalizedCity || normalizeForSearch(listing.city) === normalizedCity;
      const districtMatch =
        !normalizedDistrict ||
        (Array.isArray(listing.district)
          ? listing.district.some((d) => normalizeForSearch(d) === normalizedDistrict)
          : normalizeForSearch(String(listing.district ?? "")).includes(normalizedDistrict));

      const price = parseAmount(listing.rentAmount);
      const budgetMatch =
        (min === null || (price !== null && price >= min)) &&
        (max === null || (price !== null && price <= max));

      return (
        qMatch &&
        listingTypeMatch &&
        listingCategoryMatch &&
        propertyTypeMatch &&
        roomCountMatch &&
        cityMatch &&
        districtMatch &&
        budgetMatch
      );
    });
  }, [
    listings,
    deferredQ,
    listingType,
    listingCategory,
    propertyType,
    roomCount,
    city,
    district,
    minBudget,
    maxBudget,
  ]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortBy) {
        case "rentAmount":
          av = parseAmount(a.rentAmount) ?? Number.MIN_SAFE_INTEGER;
          bv = parseAmount(b.rentAmount) ?? Number.MIN_SAFE_INTEGER;
          break;
        case "contactDate":
          av = a.contactDate ?? "";
          bv = b.contactDate ?? "";
          break;
        default:
          av = a.createdAt ?? "";
          bv = b.createdAt ?? "";
      }
      if (av === bv) return 0;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "ar");
      return cmp * dir;
    });
  }, [filtered, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const visibleListings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const activeFilterCount = [
    q,
    listingType !== FILTER_ALL ? listingType : "",
    listingCategory !== FILTER_ALL ? listingCategory : "",
    propertyType !== FILTER_ALL ? propertyType : "",
    roomCount !== FILTER_ALL ? roomCount : "",
    city,
    district,
    minBudget,
    maxBudget,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button asChild variant="outline" size="sm">
              <Link to="/">{t("publicProperties.home")}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="hidden sm:inline-flex bg-gold-gradient text-gold-foreground hover:opacity-95"
            >
              <Link to="/property-request">
                {t("landing.findProperty") || "Find Your Property"}
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="hidden md:inline-flex bg-gold-gradient text-gold-foreground hover:opacity-95"
            >
              <Link to="/list-property">{t("publicProperties.listYourProperty")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <PageHeader title={t("publicProperties.title")} subtitle={t("publicProperties.subtitle")} />

        <FilterBar
          city={city}
          district={district}
          onCityChange={setCity}
          onDistrictChange={setDistrict}
          onReset={handleReset}
          activeCount={activeFilterCount}
          search={
            <>
              <div className="min-w-[220px] flex-1">
                <Label htmlFor="q" className="text-xs font-medium">
                  {t("common.search")}
                </Label>
                <Input
                  id="q"
                  placeholder={t("common.search")}
                  value={inputQ}
                  onChange={(e) => setInputQDebounced(e.target.value)}
                  className="mt-1 w-full"
                />
              </div>
              <div className="w-32">
                <Label htmlFor="minBudget" className="text-xs font-medium">
                  {t("common.minBudget")}
                </Label>
                <Input
                  id="minBudget"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  className="mt-1 w-full"
                />
              </div>
              <div className="w-32">
                <Label htmlFor="maxBudget" className="text-xs font-medium">
                  {t("common.maxBudget")}
                </Label>
                <Input
                  id="maxBudget"
                  type="number"
                  min="0"
                  placeholder="50000"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="mt-1 w-full"
                />
              </div>
            </>
          }
          facets={[
            {
              label: t("common.intent"),
              value: listingType,
              onValueChange: setListingType,
              options: [
                { value: LISTING_TYPE_RENTAL, label: t("listingType.Rental") },
                { value: LISTING_TYPE_SALE, label: t("listingType.Sale") },
              ],
            },
            {
              label: t("commercialListings.listingCategory"),
              value: listingCategory,
              onValueChange: setListingCategory,
              options: [
                { value: LISTING_CATEGORY_RESIDENTIAL, label: t("listingCategory.Residential") },
                { value: LISTING_CATEGORY_COMMERCIAL, label: t("listingCategory.Commercial") },
                {
                  value: LISTING_CATEGORY_INVESTMENT,
                  label: t("residentialSeekers.investment"),
                },
              ],
            },
            {
              label: t("common.type"),
              value: propertyType,
              onValueChange: setPropertyType,
              options: propertyTypeOptions.map((type) => ({ value: type, label: type })),
            },
            {
              label: t("common.rooms"),
              value: roomCount,
              onValueChange: setRoomCount,
              options: [
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
                { value: "5", label: "5" },
                { value: "6", label: "6+" },
              ],
            },
            {
              label: t("common.sortBy"),
              value: `${sortBy}-${sortDir}`,
              allowAll: false,
              onValueChange: (val) => {
                const [key, dir] = val.split("-");
                setSortBy(key);
                setSortDir(dir as "asc" | "desc");
              },
              options: [
                { value: "createdAt-desc", label: t("common.sortNewest") },
                { value: "createdAt-asc", label: t("common.sortOldest") },
                { value: "rentAmount-desc", label: t("common.sortPriceHighest") },
                { value: "rentAmount-asc", label: t("common.sortPriceLowest") },
              ],
            },
          ]}
        />

        <QuickFilterBar
          groups={[
            {
              key: "listingType",
              value: listingType,
              options: [
                { value: LISTING_TYPE_RENTAL, label: t("listingType.Rental") },
                { value: LISTING_TYPE_SALE, label: t("listingType.Sale") },
              ],
              onSelect: (value) => setUrlState({ listingType: value, page: 1 }),
            },
            {
              key: "listingCategory",
              value: listingCategory,
              options: [
                { value: LISTING_CATEGORY_RESIDENTIAL, label: t("listingCategory.Residential") },
                { value: LISTING_CATEGORY_COMMERCIAL, label: t("listingCategory.Commercial") },
                {
                  value: LISTING_CATEGORY_INVESTMENT,
                  label: t("residentialSeekers.investment"),
                },
              ],
              onSelect: (value) => {
                const options = getPropertyTypeFilterOptions(
                  !value || value === FILTER_ALL ? null : listingCategoryToArabic(value),
                );
                setUrlState({
                  listingCategory: value,
                  propertyType:
                    propertyType !== FILTER_ALL && !options.includes(propertyType)
                      ? FILTER_ALL
                      : propertyType,
                  page: 1,
                });
              },
            },
          ]}
        />

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 rounded-2xl border border-border bg-card/60" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-destructive shadow-card">
            {getFriendlyErrorMessage(error, t)}
          </div>
        ) : sorted.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
            {t("publicProperties.empty")}
          </div>
        )}

        {sorted.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <PageSizeSelect
                value={pageSize}
                onChange={(v) => {
                  setPageSize(v);
                  setPage(1);
                }}
              />
              <div className="text-sm text-muted-foreground">
                {t("common.skip", { defaultValue: "Showing" })} {(page - 1) * pageSize + 1}
                {" - "}
                {Math.min(page * pageSize, sorted.length)} {t("common.of", { defaultValue: "of" })}{" "}
                {sorted.length}
              </div>
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
      </section>
      <PublicFooter />
    </div>
  );
}

function ListingCard({ listing }: { listing: PublicListing }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const images = (listing.images?.length ? listing.images : [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeImage = images[activeIndex];
  const hasMultiple = images.length > 1;
  const resolvedImageUrl = activeImage ? resolveApiAssetUrl(activeImage.url) : "";

  const goNext = () => setActiveIndex((index) => (index + 1) % images.length);
  const goPrev = () => setActiveIndex((index) => (index - 1 + images.length) % images.length);

  const handleCardClick = () => {
    navigate({ to: "/available-properties/$id", params: { id: String(listing.id) } });
  };

  return (
    <>
      <article
        className="cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-elegant flex flex-col justify-between"
        onClick={handleCardClick}
      >
        <div>
          <div
            className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted"
            onClick={(e) => e.stopPropagation()}
          >
            {activeImage ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxOpen(true);
                  }}
                  aria-label={t("publicProperties.zoomImage", { defaultValue: "Zoom image" })}
                  className="group absolute inset-0 h-full w-full"
                >
                  <MediaPreview
                    src={resolvedImageUrl}
                    alt={activeImage.originalFileName || listing.offerCode || ""}
                    fileName={activeImage.originalFileName}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <span className="pointer-events-none absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                    <ZoomIn className="h-4 w-4" />
                  </span>
                </button>
                {hasMultiple && (
                  <>
                    <button
                      type="button"
                      aria-label={t("publicProperties.previousImage")}
                      onClick={(e) => {
                        e.stopPropagation();
                        goPrev();
                      }}
                      className="absolute start-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60 rtl:rotate-180"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("publicProperties.nextImage")}
                      onClick={(e) => {
                        e.stopPropagation();
                        goNext();
                      }}
                      className="absolute end-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60 rtl:rotate-180"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
                      {images.map((image, index) => (
                        <button
                          key={`${image.id}-${index}`}
                          type="button"
                          aria-label={t("publicProperties.goToImage", { index: index + 1 })}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveIndex(index);
                          }}
                          className={`h-2.5 w-2.5 rounded-full transition ${index === activeIndex ? "bg-white" : "bg-white/45 hover:bg-white/70"}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <ImagePlus className="h-7 w-7" />
                  <span className="text-sm">{t("common.noImages")}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-3 mt-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                {listing.offerCode || `#${listing.id}`}
              </div>
              <h2 className="mt-1 text-xl font-semibold hover:text-gold transition">
                <Link
                  to="/available-properties/$id"
                  params={{ id: String(listing.id) }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {listing.adText1 || listing.offerCode || `#${listing.id}`}
                </Link>
              </h2>
            </div>
          </div>

          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {listing.city && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>
                  {[listing.city, ...(Array.isArray(listing.district) ? listing.district : [])]
                    .filter(Boolean)
                    .join(" - ")}
                </span>
              </div>
            )}
            {!listing.city && listing.location && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>{listing.location}</span>
              </div>
            )}
            {listing.district && Array.isArray(listing.district) && listing.district.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {listing.district.map((d) => (
                  <Badge key={d} variant="secondary" className="text-xs">
                    {d}
                  </Badge>
                ))}
              </div>
            )}
            {listing.propertyType && (
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-gold" />
                <span>
                  {t(`propertyType.${listing.propertyType}`, {
                    defaultValue: listing.propertyType,
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gold" />
              <span>{formatDate(listing.createdAt)}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <PriceCard
              label={
                isSaleListing(listing.listingType) ? t("common.salePrice") : t("common.monthlyRent")
              }
              value={listing.rentAmount}
            />
            {!isSaleListing(listing.listingType) && listing.rentAmount && (
              <PriceCard label={t("common.paymentType")} value={listing.paymentType} />
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {listing.roomsCount && (
              <Badge variant="outline" className="flex items-center gap-1">
                <DoorOpen className="h-3 w-3" />
                {listing.roomsCount} {t("common.rooms")}
              </Badge>
            )}
            {listing.buildingAge && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {listing.buildingAge} {t("common.yearsOld")}
              </Badge>
            )}
            {listing.hasElevator && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {t("common.elevator")}
              </Badge>
            )}
            {listing.amenities && listing.amenities.length > 0 && (
              <>
                {listing.amenities.slice(0, 3).map((a) => (
                  <Badge key={a.id} variant="secondary" className="flex items-center gap-1 text-xs">
                    {a.name}
                  </Badge>
                ))}
                {listing.amenities.length > 3 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{listing.amenities.length - 3}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      </article>

      {lightboxOpen &&
        activeImage &&
        typeof document !== "undefined" &&
        createPortal(
          <ImageLightbox
            images={images.map((i) => ({
              url: resolveApiAssetUrl(i.url),
              alt: i.originalFileName || listing.offerCode || "",
              fileName: i.originalFileName,
            }))}
            index={activeIndex}
            onIndexChange={setActiveIndex}
            onClose={() => setLightboxOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: { url: string; alt: string; fileName?: string }[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const hasMultiple = images.length > 1;
  const current = images[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, images.length, onClose, onIndexChange]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 pointer-events-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute end-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label={t("common.close", { defaultValue: "Close" })}
      >
        <X className="h-5 w-5" />
      </button>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + images.length) % images.length);
            }}
            className="absolute start-4 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 rtl:rotate-180"
            aria-label={t("common.previous", { defaultValue: "Previous" })}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % images.length);
            }}
            className="absolute end-4 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 rtl:rotate-180"
            aria-label={t("common.next", { defaultValue: "Next" })}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <figure
        className="relative z-10 flex max-h-full max-w-6xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <MediaPreview
          src={current.url}
          alt={current.alt}
          fileName={current.fileName}
          className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
          controls
        />
        {hasMultiple && (
          <figcaption className="mt-3 text-sm text-white/70">
            {index + 1} / {images.length}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

function PriceCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <RiyalIcon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold">
        {value ? (
          <span className="inline-flex items-center gap-1">
            <span>{value}</span>
            <RiyalIcon className="h-4 w-4" />
          </span>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}
