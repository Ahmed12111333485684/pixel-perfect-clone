import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, resolveApiAssetUrl, type PublicProperty } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MediaPreview } from "@/components/MediaPreview";
import { formatDate, formatMoney } from "@/lib/format";
import { localizePropertyType } from "@/lib/property-types";
import {
  Building2,
  MapPin,
  Sparkles,
  Home,
  BadgeDollarSign,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Search,
  FilterX,
  CalendarDays,
  Hash,
  Info,
  Phone,
  Mail,
  User,
  IdCard,
  Clock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RequestPropertySuggestion } from "@/lib/api";

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

function AvailablePropertiesPage() {
  const { t } = useTranslation();
  
  const [searchParams, setSearchParams] = useState<{
    requestType?: string;
    location?: string;
    maxBudget?: number;
    bedroomCount?: number;
    requestPropertyType?: string;
  } | null>(null);

  const [formState, setFormState] = useState({
    requestType: "",
    location: "",
    maxBudget: "",
    bedroomCount: "",
    requestPropertyType: "",
  });

  const list = useQuery({
    queryKey: ["public-properties", searchParams],
    queryFn: () => {
      if (searchParams) {
        return api<(PublicProperty & RequestPropertySuggestion)[]>("/public/properties/suggest", { 
          query: searchParams as Record<string, string | number | boolean | null | undefined>,
          anonymous: true 
        });
      }
      return api<PublicProperty[]>("/public/properties", { anonymous: true });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({
      requestType: formState.requestType || undefined,
      location: formState.location || undefined,
      maxBudget: formState.maxBudget ? Number(formState.maxBudget) : undefined,
      bedroomCount: formState.bedroomCount ? Number(formState.bedroomCount) : undefined,
      requestPropertyType: formState.requestPropertyType || undefined,
    });
  };

  const clearSearch = () => {
    setFormState({
      requestType: "",
      location: "",
      maxBudget: "",
      bedroomCount: "",
      requestPropertyType: "",
    });
    setSearchParams(null);
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
          <form onSubmit={handleSearch} className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{t("common.intent")}</label>
              <Select value={formState.requestType} onValueChange={(v) => setFormState(s => ({ ...s, requestType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rental">{t("requestType.Rental")}</SelectItem>
                  <SelectItem value="sale">{t("requestType.Purchase")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{t("common.type")}</label>
              <Select value={formState.requestPropertyType} onValueChange={(v) => setFormState(s => ({ ...s, requestPropertyType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apartment">{t("propertyType.Apartment")}</SelectItem>
                  <SelectItem value="Villa">{t("propertyType.Villa")}</SelectItem>
                  <SelectItem value="Office">{t("propertyType.Office")}</SelectItem>
                  <SelectItem value="Building">{t("propertyType.Building")}</SelectItem>
                  <SelectItem value="Land">{t("propertyType.Land")}</SelectItem>
                  <SelectItem value="Shop">{t("propertyType.Shop")}</SelectItem>
                  <SelectItem value="Showroom">{t("propertyType.Showroom")}</SelectItem>
                  <SelectItem value="Warehouse">{t("propertyType.Warehouse")}</SelectItem>
                  <SelectItem value="RestHouse">{t("propertyType.RestHouse")}</SelectItem>
                  <SelectItem value="Other">{t("propertyType.Other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{t("common.location")}</label>
              <Input 
                placeholder={t("common.city")} 
                value={formState.location} 
                onChange={(e) => setFormState(s => ({ ...s, location: e.target.value }))} 
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{t("common.maxBudget")}</label>
              <Input 
                type="number" 
                placeholder="50000" 
                value={formState.maxBudget} 
                onChange={(e) => setFormState(s => ({ ...s, maxBudget: e.target.value }))} 
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{t("common.bedroomCount")}</label>
              <Input 
                type="number" 
                placeholder="3" 
                value={formState.bedroomCount} 
                onChange={(e) => setFormState(s => ({ ...s, bedroomCount: e.target.value }))} 
              />
            </div>

            <div className="flex items-end gap-2 lg:col-span-1">
              <Button type="submit" className="w-full bg-gold-gradient text-gold-foreground hover:opacity-95">
                <Search className="me-2 h-4 w-4" />
                {t("common.search")}
              </Button>
              {searchParams && (
                <Button type="button" variant="outline" size="icon" onClick={clearSearch} title={t("common.cancel")}>
                  <FilterX className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </div>

        {list.data && list.data.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {list.data.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : list.isLoading ? (
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

function PropertyCard({ property }: { property: PublicProperty & Partial<RequestPropertySuggestion> }) {
  const { t } = useTranslation();
  // Do not use `primaryImageUrl` fallback — only show images returned in `property.images`.
  const images = (property.images?.length ? property.images : [])
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
                alt={activeImage.originalFileName || property.name}
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {t("publicProperties.propertyNumber", { id: property.id })}
            {typeof property.score === "number" && (
              <Badge variant="secondary" className="ms-auto bg-gold/10 text-gold hover:bg-gold/20">
                {property.score}% Match
              </Badge>
            )}
          </div>
          <h2 className="mt-2 text-xl font-semibold">{property.name}</h2>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>{property.address}</span>
        </div>
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-gold" />
          <span>{localizePropertyType(t, property.type)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <span>{formatDate(property.createdAt)}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PriceCard label={t("common.salePrice")} value={property.salePrice} />
        <PriceCard label={t("common.monthlyRent")} value={property.rentPrice} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(property.amenities ?? []).slice(0, 4).map((amenity) => (
          <Badge key={amenity.id} variant="outline">
            {amenity.name}
          </Badge>
        ))}
        {(property.amenities?.length ?? 0) > 4 && (
          <Badge variant="outline">
            {t("publicProperties.moreAmenities", { count: property.amenities!.length - 4 })}
          </Badge>
        )}
      </div>

      {property.reasons && property.reasons.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
          <span className="w-full text-xs font-medium text-muted-foreground">{t("suggestions.reasonsTitle", { defaultValue: "Why this property?" })}</span>
          {property.reasons.map((reason, idx) => (
            <Badge key={idx} variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10">
              <Sparkles className="me-1 h-3 w-3" />
              {t(`suggestions.reasons.${reason.key}`, reason.args)}
            </Badge>
          ))}
        </div>
      )}

      {lightboxOpen && activeImage && (
        <ImageLightbox
          images={images.map((i) => ({
            url: resolveApiAssetUrl(i.url),
            alt: i.originalFileName || property.name,
            fileName: i.originalFileName,
          }))}
          index={activeIndex}
          onIndexChange={setActiveIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
      </article>
      <PropertyDetailsDialog 
        property={property}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
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
        className="absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
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
            className="absolute start-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 rtl:rotate-180"
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
            className="absolute end-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 rtl:rotate-180"
            aria-label={t("common.next", { defaultValue: "Next" })}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <figure
        className="flex max-h-full max-w-6xl flex-col items-center"
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

function PriceCard({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <BadgeDollarSign className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold">
        {typeof value === "number" && value > 0 ? formatMoney(value) : "—"}
      </div>
    </div>
  );
}

function PropertyDetailsDialog({
  property,
  open,
  onOpenChange,
}: {
  property: PublicProperty & Partial<RequestPropertySuggestion>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  
  if (!property) return null;

  const images = (property.images?.length ? property.images : [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const primary = images.find((i) => i.isPrimary) ?? images[0];

  const detailEntries = Object.entries((property.details ?? {}) as Record<string, unknown>).filter(
    ([, v]) => hasValue(v),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card/95 backdrop-blur-md">
        <ScrollArea className="max-h-[90vh] overflow-y-auto">
          <div className="relative aspect-video w-full bg-muted lg:aspect-[21/9]">
            {primary ? (
              <MediaPreview
                src={resolveApiAssetUrl(primary.url)}
                alt={primary.originalFileName || property.name}
                className="h-full w-full object-cover"
              />
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
                <span className="font-mono text-white">#{property.id}</span>
              </div>
              <DialogTitle className="mt-2 text-2xl font-semibold md:text-3xl text-white">
                {property.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("common.propertyDetails", { defaultValue: "Property Details" })}
              </DialogDescription>
              <div className="mt-2 flex items-center gap-2 text-sm text-white/90">
                <MapPin className="h-4 w-4 text-gold" />
                <span>{property.address}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-5">
              <div className="space-y-6 md:col-span-3">
                <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold">
                    <BadgeDollarSign className="h-5 w-5 text-gold" />
                    {t("common.price")}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">{t("common.salePrice")}</div>
                      <div className="text-lg font-medium">{property.salePrice ? formatMoney(property.salePrice) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">{t("common.monthlyRent")}</div>
                      <div className="text-lg font-medium">{property.rentPrice ? formatMoney(property.rentPrice) : "—"}</div>
                    </div>
                  </div>
                </div>

                {detailEntries.length > 0 && (
                  <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold">
                      <Info className="h-5 w-5 text-gold" />
                      {t("common.details")}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {detailEntries.map(([k, v]) => (
                        <div key={k}>
                          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {iconForKey(k)}
                            <span>{labelFor(k, t)}</span>
                          </div>
                          <div className="mt-1 text-sm font-medium">{renderValue(v, t)}</div>
                        </div>
                      ))}
                    </div>
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
                      <span className="font-medium">{localizePropertyType(t, property.type)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2 text-sm">
                      <span className="text-muted-foreground">{t("common.createdAt")}</span>
                      <span className="font-medium">{formatDate(property.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {property.amenities && property.amenities.length > 0 && (
                  <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold">
                      <Sparkles className="h-5 w-5 text-gold" />
                      {t("nav.amenities")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((a) => (
                        <Badge key={a.id} variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10">
                          {a.name}
                        </Badge>
                      ))}
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

// --- Helpers ---

const FIELD_LABEL_KEYS: Record<string, string> = {
  rooms: "common.rooms",
  area: "common.area",
  facade: "common.facade",
  street_width: "common.streetWidth",
  category: "common.category",
  floor: "common.floor",
  furnished: "common.furnished",
  price_per_meter: "common.pricePerMeter",
  zoning: "common.zoning",
  buildable: "common.buildable",
  frontage_m: "common.frontageM",
  street_facing: "common.streetFacing",
  storefront_width_m: "common.storefrontWidthM",
  has_storage: "common.hasStorage",
  ceiling_height_m: "common.ceilingHeightM",
  loading_docks: "common.loadingDocks",
  climate_control: "common.climateControl",
  yard_area: "common.yardArea",
};

function hasValue(v: unknown) {
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function humanizeKey(k: string) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function labelFor(k: string, t: (k: string) => string): string {
  const i18nKey = FIELD_LABEL_KEYS[k];
  if (i18nKey) {
    const translated = t(i18nKey);
    if (translated && translated !== i18nKey) return translated;
  }
  return humanizeKey(k);
}

function iconForKey(k: string): React.ReactNode {
  const cls = "h-4 w-4";
  if (/phone/i.test(k)) return <Phone className={cls} />;
  if (/email/i.test(k)) return <Mail className={cls} />;
  if (/name/i.test(k)) return <User className={cls} />;
  if (/(nationalId|deed|number|id$)/i.test(k)) return <IdCard className={cls} />;
  if (/(date|At$|time)/i.test(k)) return <Clock className={cls} />;
  if (/address|location/i.test(k)) return <MapPin className={cls} />;
  if (/note/i.test(k)) return <Info className={cls} />;
  if (/assigned/i.test(k)) return <User className={cls} />;
  return <Info className={cls} />;
}

function renderValue(v: unknown, t: (k: string) => string): React.ReactNode {
  if (!hasValue(v)) return <span className="text-muted-foreground">{t("common.notProvided")}</span>;
  if (typeof v === "boolean") return v ? t("common.yes") : t("common.no");
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDate(v);
    const translatedEnum = t(`enums.${v}`);
    if (translatedEnum && translatedEnum !== `enums.${v}`) return translatedEnum;
    return v;
  }
  if (Array.isArray(v))
    return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
