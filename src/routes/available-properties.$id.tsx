import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { fetchPublicListing, resolveApiAssetUrl, type PublicListing } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Hash,
  Info,
  Tag,
  Layers,
  DoorOpen,
  CalendarDays,
  ArrowLeft,
  Share2,
  Check,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { RiyalIcon } from "@/components/icons/RiyalIcon";
import { ListingLocationMap } from "@/components/ListingLocationMap";
import { toast } from "sonner";

export const Route = createFileRoute("/available-properties/$id")({
  head: ({ loaderData }: { loaderData?: any }) => ({
    meta: [
      { title: loaderData?.title ?? "Property Details — Nour Consultancy" },
      { name: "description", content: loaderData?.description ?? "Property details and photos." },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const id = Number(params.id);
      if (isNaN(id)) return null;
      const listing = await fetchPublicListing(id);
      const title = listing.adText1 || listing.offerCode || `Property #${listing.id}`;
      const description = listing.adText2 || `${listing.propertyType || "Property"} in ${listing.city || listing.location || "Saudi Arabia"}`;
      return { title: `${title} — Nour Consultancy`, description };
    } catch {
      return null;
    }
  },
  component: AvailablePropertyDetailPage,
});

function AvailablePropertyDetailPage() {
  const { id } = Route.useParams();
  const numericId = Number(id);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ["public-listing", numericId],
    queryFn: () => fetchPublicListing(numericId),
    enabled: !isNaN(numericId),
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const images = (listing?.images?.length ? listing.images : [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const activeImage = images[activeIndex] ?? images[0];

  const handleShare = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success(t("publicProperties.linkCopied", { defaultValue: "Link copied to clipboard!" }));
    setTimeout(() => setCopied(false), 2500);
  };

  const getWhatsAppUrl = () => {
    if (!listing) return "#";
    const title = listing.adText1 || listing.offerCode || `#${listing.id}`;
    const code = listing.offerCode || `#${listing.id}`;
    const text = encodeURIComponent(
      `مرحباً شركة نور الاستشارة، أود الاستفسار عن العقار المعروض:\n- الكود/المرجع: ${code}\n- العنوان: ${title}\n- الرابط: ${typeof window !== "undefined" ? window.location.href : ""}`
    );
    return `https://wa.me/966500000000?text=${text}`; // Adjust phone if configured in environment
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <HeaderBar />
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-muted mb-6" />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="h-96 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
            <div className="h-96 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <HeaderBar />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-card">
            <Info className="h-12 w-12 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{t("error.notFound", { defaultValue: "Property not found" })}</h1>
            <p className="text-sm text-muted-foreground">
              {t("publicProperties.empty", { defaultValue: "The property listing you are looking for is no longer available or has been removed." })}
            </p>
            <Button asChild className="bg-gold-gradient text-gold-foreground">
              <Link to="/available-properties">{t("publicProperties.backToProperties", { defaultValue: "Back to Available Properties" })}</Link>
            </Button>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const priceLabel = listing.listingType === "Sale" ? t("common.salePrice") : t("common.monthlyRent");

  return (
    <div className="min-h-screen bg-background">
      <HeaderBar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/available-properties" })}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
            {t("publicProperties.backToProperties", { defaultValue: "Back to Available Properties" })}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2 border-border shadow-sm hover:border-gold/50"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4 text-gold" />}
            <span>{copied ? t("publicProperties.linkCopied", { defaultValue: "Copied!" }) : t("publicProperties.shareProperty", { defaultValue: "Share Property" })}</span>
          </Button>
        </div>

        {/* Title & Headline Header */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Badge variant="outline" className="border-gold/40 text-gold bg-gold/5">
                  {listing.listingType ? t(`listingType.${listing.listingType}`, { defaultValue: listing.listingType }) : t("common.forRent")}
                </Badge>
                {listing.offerCode && (
                  <Badge variant="secondary" className="gap-1 font-mono">
                    <Tag className="h-3 w-3" />
                    {listing.offerCode}
                  </Badge>
                )}
                <span className="text-muted-foreground/60">•</span>
                <span className="flex items-center gap-1 font-normal">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(listing.createdAt)}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl text-foreground">
                {listing.adText1 || listing.offerCode || `#${listing.id}`}
              </h1>
              {(listing.city || listing.location) && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-gold" />
                  <span>
                    {[listing.city, listing.location, ...(Array.isArray(listing.district) ? listing.district : [])]
                      .filter(Boolean)
                      .join(" - ")}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-end">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{priceLabel}</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {listing.rentAmount ? (
                  <span className="inline-flex items-center gap-1">
                    <span>{listing.rentAmount}</span>
                    <RiyalIcon className="h-5 w-5 text-gold" />
                  </span>
                ) : (
                  "—"
                )}
              </div>
              {listing.paymentType && listing.listingType !== "Sale" && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("common.paymentType")}: <span className="font-medium text-foreground">{listing.paymentType}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content (Images + Specs + Details + Map) */}
          <div className="space-y-8 lg:col-span-2">
            {/* Gallery Section */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                {activeImage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="group relative h-full w-full cursor-zoom-in"
                      aria-label={t("publicProperties.zoomImage")}
                    >
                      <MediaPreview
                        src={resolveApiAssetUrl(activeImage.url)}
                        alt={activeImage.originalFileName || listing.offerCode || ""}
                        fileName={activeImage.originalFileName}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <span className="pointer-events-none absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition group-hover:bg-black/70">
                        <ZoomIn className="h-5 w-5" />
                      </span>
                    </button>

                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
                          className="absolute start-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 rtl:rotate-180"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
                          className="absolute end-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 rtl:rotate-180"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImagePlus className="h-10 w-10" />
                    <span>{t("common.noImages")}</span>
                  </div>
                )}
              </div>

              {/* Thumbnails list */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-4 bg-muted/30">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        idx === activeIndex ? "border-gold ring-2 ring-gold/30" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <MediaPreview
                        src={resolveApiAssetUrl(img.url)}
                        alt={img.originalFileName || ""}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Specifications Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Info className="h-5 w-5 text-gold" />
                {t("common.overview", { defaultValue: "Property Overview" })}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {listing.propertyType && (
                  <SpecBox icon={<Home className="h-4 w-4" />} label={t("common.type")} value={t(`propertyType.${listing.propertyType}`, { defaultValue: listing.propertyType })} />
                )}
                {listing.roomsCount && (
                  <SpecBox icon={<DoorOpen className="h-4 w-4" />} label={t("common.rooms")} value={`${listing.roomsCount} ${t("common.rooms")}`} />
                )}
                {listing.buildingAge && (
                  <SpecBox icon={<Building2 className="h-4 w-4" />} label={t("common.buildingAge")} value={`${listing.buildingAge} ${t("common.yearsOld")}`} />
                )}
                {listing.hasElevator && (
                  <SpecBox icon={<Layers className="h-4 w-4" />} label={t("common.elevator")} value={listing.hasElevator} />
                )}
                {listing.availableUnits && (
                  <SpecBox icon={<Layers className="h-4 w-4" />} label={t("commercialListings.availableUnits")} value={listing.availableUnits} />
                )}
                {listing.offerCode && (
                  <SpecBox icon={<Hash className="h-4 w-4" />} label={t("commercialListings.offerCode")} value={listing.offerCode} />
                )}
              </div>
            </div>

            {/* Detailed Description / Text 2 */}
            {listing.adText2 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Info className="h-5 w-5 text-gold" />
                  {t("common.details", { defaultValue: "Property Description" })}
                </h2>
                <div
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                  className="prose max-w-none text-base leading-relaxed text-foreground/90 whitespace-pre-wrap"
                >
                  {listing.adText2}
                </div>
              </div>
            )}

            {/* Amenities Section */}
            {listing.amenities && listing.amenities.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Tag className="h-5 w-5 text-gold" />
                  {t("nav.amenities", { defaultValue: "Amenities" })}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map((amenity) => (
                    <Badge
                      key={amenity.id}
                      variant="secondary"
                      className="px-3 py-1.5 text-sm font-medium border border-border/60"
                    >
                      {amenity.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Location & Map Section */}
            {listing.coordinates && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="h-5 w-5 text-gold" />
                  {t("common.location", { defaultValue: "Property Location" })}
                </h2>
                <ListingLocationMap coordinates={listing.coordinates} heightClassName="h-96" />
                <Button asChild variant="outline" className="mt-4 w-full gap-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${listing.coordinates}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="h-4 w-4 text-gold" />
                    <span>{t("common.openInGoogleMaps", { defaultValue: "Open in Google Maps" })}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Sticky Sidebar Action Card */}
          <div className="space-y-6">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-card space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.propertyId")}</span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">{listing.offerCode || `#${listing.id}`}</h3>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="w-full gap-2 py-6 text-base font-semibold border-border hover:border-gold/50"
                >
                  {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Share2 className="h-5 w-5 text-gold" />}
                  {copied ? t("publicProperties.linkCopied", { defaultValue: "Link Copied!" }) : t("publicProperties.shareProperty", { defaultValue: "Share Property Link" })}
                </Button>

                <Button
                  asChild
                  className="w-full gap-2 py-6 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-5 w-5" />
                    {t("publicProperties.contactWhatsApp", { defaultValue: "Contact via WhatsApp" })}
                  </a>
                </Button>

                <Button
                  asChild
                  variant="default"
                  className="w-full gap-2 py-6 text-base font-semibold bg-gold-gradient text-gold-foreground hover:opacity-95 shadow-gold"
                >
                  <Link to="/property-request">
                    <Home className="h-5 w-5" />
                    {t("landing.findProperty", { defaultValue: "Request / Inquire Property" })}
                  </Link>
                </Button>
              </div>

              <div className="rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground space-y-1.5">
                <div className="font-semibold text-foreground">{t("brand.name")}</div>
                <div>{t("footer.addressLine1")}</div>
                <div>{t("footer.addressLine2")}</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox Portal */}
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

      <PublicFooter />
    </div>
  );
}

function HeaderBar() {
  const { t } = useTranslation();
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
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
            <Link to="/available-properties">{t("publicProperties.browse")}</Link>
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
  );
}

function SpecBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3.5">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="text-gold">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1 font-semibold text-foreground text-sm">{value}</div>
    </div>
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
