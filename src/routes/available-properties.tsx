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
import { formatDate, formatMoney } from "@/lib/format";
import { Building2, MapPin, Sparkles, Home, BadgeDollarSign, ImagePlus, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

export const Route = createFileRoute("/available-properties")({
  head: () => ({
    meta: [
      { title: "Available Properties — Estatly" },
      { name: "description", content: "Browse available properties with their sale and rent prices." },
    ],
  }),
  component: AvailablePropertiesPage,
});

function AvailablePropertiesPage() {
  const { t } = useTranslation();
  const list = useQuery({
    queryKey: ["public-properties"],
    queryFn: () => api<PublicProperty[]>("/api/public/properties", { anonymous: true }),
  });

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
            <Button asChild size="sm" className="bg-gold-gradient text-gold-foreground hover:opacity-95">
              <Link to="/list-property">{t("publicProperties.listYourProperty")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <PageHeader
          title={t("publicProperties.title")}
          subtitle={t("publicProperties.subtitle")}
        />

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
    </div>
  );
}

function PropertyCard({ property }: { property: PublicProperty }) {
  const { t } = useTranslation();
  const images = (property.images?.length ? property.images : property.primaryImageUrl ? [{ id: 0, originalFileName: property.name, url: property.primaryImageUrl, isPrimary: true, sortOrder: 0 }] : [])
    .slice()
    .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.id - b.id));
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeImage = images[activeIndex];
  const hasMultiple = images.length > 1;
  const resolvedImageUrl = activeImage ? resolveApiAssetUrl(activeImage.url) : "";

  const goNext = () => setActiveIndex((index) => (index + 1) % images.length);
  const goPrev = () => setActiveIndex((index) => (index - 1 + images.length) % images.length);

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-elegant">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted">
        {activeImage ? (
          <>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={t("publicProperties.zoomImage", { defaultValue: "Zoom image" })}
              className="group absolute inset-0 h-full w-full"
            >
              <img src={resolvedImageUrl} alt={activeImage.originalFileName || property.name} className="h-full w-full object-cover transition group-hover:scale-105" />
              <span className="pointer-events-none absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                <ZoomIn className="h-4 w-4" />
              </span>
            </button>
            {hasMultiple && (
              <>
                <button
                  type="button"
                  aria-label={t("publicProperties.previousImage")}
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute start-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60 rtl:rotate-180"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label={t("publicProperties.nextImage")}
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
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
                      onClick={(e) => { e.stopPropagation(); setActiveIndex(index); }}
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
          <span>{property.type}</span>
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
          <Badge key={amenity.id} variant="outline">{amenity.name}</Badge>
        ))}
        {(property.amenities?.length ?? 0) > 4 && (
          <Badge variant="outline">{t("publicProperties.moreAmenities", { count: property.amenities!.length - 4 })}</Badge>
        )}
      </div>

      {lightboxOpen && activeImage && (
        <ImageLightbox
          images={images.map((i) => ({ url: resolveApiAssetUrl(i.url), alt: i.originalFileName || property.name }))}
          index={activeIndex}
          onIndexChange={setActiveIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </article>
  );
}

function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: { url: string; alt: string }[];
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
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label={t("common.close", { defaultValue: "Close" })}
      >
        <X className="h-5 w-5" />
      </button>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + images.length) % images.length); }}
            className="absolute start-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 rtl:rotate-180"
            aria-label={t("common.previous", { defaultValue: "Previous" })}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % images.length); }}
            className="absolute end-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 rtl:rotate-180"
            aria-label={t("common.next", { defaultValue: "Next" })}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <figure className="flex max-h-full max-w-6xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={current.url}
          alt={current.alt}
          className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
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
      <div className="mt-2 text-lg font-semibold">{typeof value === "number" && value > 0 ? formatMoney(value) : "—"}</div>
    </div>
  );
}