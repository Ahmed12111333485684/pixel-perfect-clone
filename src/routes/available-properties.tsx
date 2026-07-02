import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import {
  Building2,
  MapPin,
  Home,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Search,
  FilterX,
  Hash,
  Info,
  Tag,
  Layers,
  Key,
  DoorOpen,
  CalendarDays,
} from "lucide-react";
import { RiyalIcon } from "@/components/icons/RiyalIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListingLocationMap } from "@/components/ListingLocationMap";

export const Route = createFileRoute("/available-properties")({
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

const PROPERTY_TYPES = [
  "Apartment", "Villa", "Office", "Building", "Land", "Shop", "Showroom", "Warehouse", "RestHouse", "Other"
] as const;

function AvailablePropertiesPage() {
  const { t } = useTranslation();

  const [formState, setFormState] = useState({
    listingType: "",
    location: "",
    maxBudget: "",
    propertyType: "",
  });

  const [filters, setFilters] = useState<typeof formState | null>(null);

  const { data: listings, isLoading } = useQuery({
    queryKey: ["public-listings"],
    queryFn: () => api<PublicListing[]>("/public/listings", { anonymous: true }),
  });

  const filtered = useMemo(() => {
    if (!listings) return [];
    let result = listings;
    if (filters) {
      if (filters.listingType) {
        result = result.filter(l =>
          l.listingType?.toLowerCase() === filters.listingType.toLowerCase()
        );
      }
      if (filters.propertyType) {
        result = result.filter(l =>
          l.propertyType?.toLowerCase() === filters.propertyType.toLowerCase()
        );
      }
      if (filters.location) {
        const q = filters.location.toLowerCase();
        result = result.filter(l => l.location?.toLowerCase().includes(q));
      }
      if (filters.maxBudget) {
        const budget = Number(filters.maxBudget);
        if (!isNaN(budget)) {
          result = result.filter(l => {
            const price = parseFloat(l.rentAmount ?? "0");
            return !isNaN(price) && price <= budget;
          });
        }
      }
    }
    return result;
  }, [listings, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({
      listingType: formState.listingType,
      location: formState.location,
      maxBudget: formState.maxBudget,
      propertyType: formState.propertyType,
    });
  };

  const clearSearch = () => {
    setFormState({ listingType: "", location: "", maxBudget: "", propertyType: "" });
    setFilters(null);
  };

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
              className="bg-gold-gradient text-gold-foreground hover:opacity-95"
            >
              <Link to="/property-request">
                {t("landing.findProperty") || "Find Your Property"}
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-gold-gradient text-gold-foreground hover:opacity-95"
            >
              <Link to="/list-property">{t("publicProperties.listYourProperty")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <PageHeader title={t("publicProperties.title")} subtitle={t("publicProperties.subtitle")} />

        <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSearch} className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("common.intent")}</label>
              <Select value={formState.listingType} onValueChange={(v) => setFormState(s => ({ ...s, listingType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rental">{t("listingType.Rental")}</SelectItem>
                  <SelectItem value="Sale">{t("listingType.Sale")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("common.type")}</label>
              <Select value={formState.propertyType} onValueChange={(v) => setFormState(s => ({ ...s, propertyType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.all")} />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{t(`propertyType.${type}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("common.location")}</label>
              <Input
                placeholder={t("common.city")}
                value={formState.location}
                onChange={(e) => setFormState(s => ({ ...s, location: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("common.maxBudget")}</label>
              <Input
                type="number"
                placeholder="50000"
                value={formState.maxBudget}
                onChange={(e) => setFormState(s => ({ ...s, maxBudget: e.target.value }))}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" className="w-full bg-gold-gradient text-gold-foreground hover:opacity-95">
                <Search className="me-2 h-4 w-4" />
                {t("common.search")}
              </Button>
              {filters && (
                <Button type="button" variant="outline" size="icon" onClick={clearSearch} title={t("common.cancel")}>
                  <FilterX className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 rounded-2xl border border-border bg-card/60" />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
            {t("publicProperties.empty")}
          </div>
        )}
      </section>
      <PublicFooter />
    </div>
  );
}

function ListingCard({ listing }: { listing: PublicListing }) {
  const { t } = useTranslation();
  const images = (listing.images?.length ? listing.images : [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const activeImage = images[activeIndex];
  const hasMultiple = images.length > 1;
  const resolvedImageUrl = activeImage ? resolveApiAssetUrl(activeImage.url) : "";

  const goNext = () => setActiveIndex((index) => (index + 1) % images.length);
  const goPrev = () => setActiveIndex((index) => (index - 1 + images.length) % images.length);

  return (
    <>
      <article
        className="cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-elegant"
        onClick={() => setDetailsOpen(true)}
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted" onClick={(e) => e.stopPropagation()}>
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
            <h2 className="mt-1 text-xl font-semibold">{listing.adText1 || listing.offerCode || `#${listing.id}`}</h2>
          </div>
        </div>

        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          {listing.location && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{listing.location}</span>
            </div>
          )}
          {listing.propertyType && (
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-gold" />
              <span>{t(`propertyType.${listing.propertyType}`, { defaultValue: listing.propertyType })}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold" />
            <span>{formatDate(listing.createdAt)}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PriceCard
            label={listing.listingType === "Sale" ? t("common.salePrice") : t("common.monthlyRent")}
            value={listing.rentAmount}
          />
          {listing.listingType !== "Sale" && listing.rentAmount && (
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
      </article>

      {lightboxOpen && activeImage && typeof document !== "undefined" && createPortal(
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

      <ListingDetailsDialog
        listing={listing}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isLightboxOpen={lightboxOpen}
        onOpenImage={(index) => {
          setActiveIndex(index);
          setLightboxOpen(true);
        }}
      />
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
  const { t } = useTranslation();
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
        ) : "—"}
      </div>
    </div>
  );
}

function ListingDetailsDialog({
  listing,
  open,
  onOpenChange,
  isLightboxOpen,
  onOpenImage,
}: {
  listing: PublicListing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLightboxOpen?: boolean;
  onOpenImage?: (index: number) => void;
}) {
  const { t } = useTranslation();

  if (!listing) return null;

  const images = (listing.images?.length ? listing.images : [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const primary = images.find((i) => i.isPrimary) ?? images[0];
  const primaryIndex = primary ? images.findIndex((i) => i.id === primary.id) : 0;

  const detailFields: { label: string; icon: React.ReactNode; value?: string | null }[] = [
    { label: t("common.rooms"), icon: <DoorOpen className="h-4 w-4" />, value: listing.roomsCount },
    { label: t("common.buildingAge"), icon: <Building2 className="h-4 w-4" />, value: listing.buildingAge },
    { label: t("commercialListings.availableUnits"), icon: <Layers className="h-4 w-4" />, value: listing.availableUnits },
    { label: t("common.paymentType"), icon: <RiyalIcon className="h-4 w-4" />, value: listing.paymentType },
    // { label: t("common.coordinates"), icon: <MapPin className="h-4 w-4" />, value: listing.coordinates },
  ].filter(f => f.value != null && f.value !== "");

  const priceLabel = listing.listingType === "Sale" ? t("common.salePrice") : t("common.monthlyRent");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden bg-card/95 backdrop-blur-md"
        onPointerDownOutside={(event) => {
          if (isLightboxOpen) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isLightboxOpen) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (isLightboxOpen) event.preventDefault();
        }}
      >
        <ScrollArea className="max-h-[90vh] overflow-y-auto">
          <div className="relative aspect-video w-full bg-muted lg:aspect-[21/9]">
            {primary ? (
              <button
                type="button"
                className="group relative h-full w-full cursor-zoom-in"
                onClick={() => onOpenImage?.(primaryIndex >= 0 ? primaryIndex : 0)}
                aria-label={t("publicProperties.zoomImage", { defaultValue: "Zoom image" })}
              >
                <MediaPreview
                  src={resolveApiAssetUrl(primary.url)}
                  alt={primary.originalFileName || listing.offerCode || ""}
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
                <span className="pointer-events-none absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                  <ZoomIn className="h-4 w-4" />
                </span>
              </button>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm">{t("common.noImages")}</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-6 pt-24 text-white">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
                <Hash className="h-3.5 w-3.5" />
                <span>{t("common.propertyId")}</span>
                <span className="font-mono text-white">#{listing.id}</span>
              </div>
              <DialogTitle className="mt-2 text-2xl font-semibold md:text-3xl text-white">
                {listing.adText1 || listing.offerCode || `#${listing.id}`}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("common.propertyDetails", { defaultValue: "Property Details" })}
              </DialogDescription>
              {listing.location && (
                <div className="mt-2 flex items-center gap-2 text-sm text-white/90">
                  <MapPin className="h-4 w-4 text-gold" />
                  <span>{listing.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-5">
              <div className="space-y-6 md:col-span-3">
                <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold">
                    <RiyalIcon className="h-5 w-5 text-gold" />
                    {t("common.price")}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">{priceLabel}</div>
                      <div className="text-lg font-medium">{listing.rentAmount ? <span className="inline-flex items-center gap-1"><span>{listing.rentAmount}</span><RiyalIcon className="h-4 w-4" /></span> : "—"}</div>
                    </div>
                  </div>
                </div>

                {(detailFields.length > 0 || listing.adText2) && (
                  <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold">
                      <Info className="h-5 w-5 text-gold" />
                      {t("common.details")}
                    </h3>
                    {detailFields.length > 0 && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {detailFields.map((f, i) => (
                          <div key={i}>
                            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {f.icon}
                              <span>{f.label}</span>
                            </div>
                            <div className="mt-1 text-sm font-medium">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {listing.adText2 && (
                      <div className={"text-sm whitespace-pre-wrap" + (detailFields.length > 0 ? " mt-4 border-t border-border pt-4" : "")}>
                        {listing.adText2}
                      </div>
                    )}
                  </div>
                )}

                {/* {((listing.amenities && listing.amenities.length > 0) || listing.hasElevator) && (
                  <div className="rounded-xl border border-border bg-gradient-to-br from-background to-muted/30 p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold">
                      <Tag className="h-5 w-5 text-gold" />
                      {t("nav.amenities", { defaultValue: "Amenities" })}
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {listing.amenities?.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:border-gold/30 hover:bg-gold/5"
                        >
                          <div className="h-2 w-2 rounded-full bg-gold" />
                          {a.name}
                        </div>
                      ))}
                      {listing.hasElevator && (
                        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-sm">
                          <Layers className="h-4 w-4 text-gold" />
                          {t("common.elevator")}
                        </div>
                      )}  
                    </div>
                  </div>
                )} */}

                {listing.coordinates && (
                  <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold">
                      <MapPin className="h-5 w-5 text-gold" />
                      {t("commercialListings.coordinates")}
                    </h3>
                    <ListingLocationMap
                      coordinates={listing.coordinates}
                      className="space-y-2"
                      heightClassName="h-[34rem]"
                    />
                    <Button
                      asChild
                      variant="outline"
                      className="mt-4 w-full flex items-center justify-center gap-2"
                    >
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${listing.coordinates}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="h-4 w-4 text-gold" />
                        فتح في خرائط جوجل
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-6 md:col-span-2">
                <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold">
                    <Home className="h-5 w-5 text-gold" />
                    {t("common.overview")}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2 text-sm">
                      <span className="text-muted-foreground">{t("common.type")}</span>
                      <span className="font-medium">
                        {listing.propertyType
                          ? t(`propertyType.${listing.propertyType}`, { defaultValue: listing.propertyType })
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2 text-sm">
                      <span className="text-muted-foreground">{t("commercialListings.offerCode")}</span>
                      <span className="font-medium">{listing.offerCode || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2 text-sm">
                      <span className="text-muted-foreground">{t("commercialListings.listingCategory")}</span>
                      <span className="font-medium">
                        {listing.listingCategory
                          ? t(`listingCategory.${listing.listingCategory}`, { defaultValue: listing.listingCategory })
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2 text-sm">
                      <span className="text-muted-foreground">{t("common.createdAt")}</span>
                      <span className="font-medium">{formatDate(listing.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {((listing.amenities && listing.amenities.length > 0) || listing.hasElevator) && (
                  <div className="rounded-xl border border-border bg-gradient-to-br from-background to-muted/30 p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold">
                      <Tag className="h-5 w-5 text-gold" />
                      {t("nav.amenities", { defaultValue: "Amenities" })}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {listing.amenities?.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:border-gold/30 hover:bg-gold/5"
                        >
                          <div className="h-2 w-2 rounded-full bg-gold" />
                          {a.name}
                        </div>
                      ))}
                      {listing.hasElevator && (
                        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-sm">
                          <Layers className="h-4 w-4 text-gold" />
                          {t("common.elevator")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
