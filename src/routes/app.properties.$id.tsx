import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, resolveApiAssetUrl, type PropertyDto, type PropertyImage, type PropertyStatus, type Owner } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatusBadge, LoadingBlock, ErrorBlock, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Star, Trash2, Upload, ImagePlus, X, ChevronLeft, ChevronRight, ExternalLink,
  MapPin, Home, Hash, CalendarDays, User, Phone, Mail, IdCard, Clock, Info, Sparkles, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { propertyStatusTone, formatDate } from "@/lib/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/properties/$id")({
  component: PropertyDetail,
});

const STATUSES: PropertyStatus[] = ["Pending", "Approved", "Rejected", "Sold"];

// Map of well-known DTO keys -> i18n label keys (so optional fields render with proper translations)
const FIELD_LABEL_KEYS: Record<string, string> = {
  preferredContactAt: "common.preferredContactAt",
  lastContactedAt: "common.lastContactedAt",
  assignedToUsername: "common.assignedTo",
  notes: "common.notes",
  intent: "common.intent",
  fullName: "common.fullName",
  phone: "common.phone",
  email: "common.email",
  ownerNationalId: "common.nationalId",
  nationalId: "common.nationalId",
  description: "common.description",
};

const KNOWN_TOP_KEYS = new Set(["id", "ownerId", "name", "address", "type", "status", "createdAt", "amenities"]);
// Fields rendered explicitly in dedicated sections — exclude from "additional" bucket.
const CONTACT_KEYS = new Set(["fullName", "phone", "email", "preferredContactAt", "lastContactedAt", "assignedToUsername", "ownerNationalId", "nationalId", "notes"]);

function PropertyDetail() {
  const { id } = Route.useParams();
  const propId = Number(id);
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const property = useQuery({
    queryKey: ["property", propId],
    queryFn: () => api<PropertyDto>(`/api/properties/${propId}`),
  });
  const images = useQuery({
    queryKey: ["property-images", propId],
    queryFn: () => api<PropertyImage[]>(`/api/properties/${propId}/images`),
  });

  const ownerId = property.data?.ownerId;
  const owner = useQuery({
    queryKey: ["owner", ownerId],
    queryFn: () => api<Owner>(`/api/owners/${ownerId}`),
    enabled: !!ownerId && auth.isStaff,
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await api(`/api/properties/${propId}/images`, { method: "POST", formData: fd });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["property-images", propId] }); toast.success(t("common.success")); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setPrimary = useMutation({
    mutationFn: (imageId: number) => api(`/api/properties/${propId}/images/${imageId}/primary`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["property-images", propId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delImg = useMutation({
    mutationFn: (imageId: number) => api(`/api/properties/${propId}/images/${imageId}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["property-images", propId] }); toast.success(t("common.deleted")); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: (imageIdsInOrder: number[]) =>
      api(`/api/properties/${propId}/images/reorder`, { method: "PUT", body: { imageIdsInOrder } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["property-images", propId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: (status: PropertyStatus) => {
      if (status === "Sold") {
        throw new Error(t("error.soldStatusRequiresSale"));
      }
      return api(`/api/properties/${propId}/status`, { method: "PUT", body: { status } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["property", propId] }); qc.invalidateQueries({ queryKey: ["properties"] }); toast.success(t("common.updated")); },
    onError: (e: Error) => toast.error(e.message),
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sorted = (images.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = sorted.find((i) => i.isPrimary) ?? sorted[0];

  const onDropOnto = (overId: number) => {
    if (dragId === null || dragId === overId) return;
    const ids = sorted.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorder.mutate(ids);
    setDragId(null);
  };

  if (property.isLoading) return <LoadingBlock />;
  if (property.error) return <ErrorBlock message={(property.error as Error).message} />;
  if (!property.data) return null;

  const p = property.data;

  // Bucket the DTO into contact-style fields and miscellaneous extras.
  const allEntries = Object.entries(p as unknown as Record<string, unknown>);
  const contactEntries = allEntries.filter(([k, v]) => CONTACT_KEYS.has(k) && hasValue(v));
  const additionalEntries = allEntries.filter(
    ([k, v]) => !KNOWN_TOP_KEYS.has(k) && !CONTACT_KEYS.has(k) && hasValue(v),
  );

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/properties" })} className="mb-3">
        <ArrowLeft className="me-1 h-4 w-4 rtl:rotate-180" />
        {t("common.back")}
      </Button>

      <PageHeader
        title={p.name}
        subtitle={p.address}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={propertyStatusTone(p.status)}>{t(`propertyStatus.${p.status}`)}</StatusBadge>
            {auth.isStaff && (
              <Select value={p.status} onValueChange={(v) => updateStatus.mutate(v as PropertyStatus)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`propertyStatus.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      {/* Hero card — mirrors the intake form's elegant card surface */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
        <div className="grid gap-0 md:grid-cols-5">
          <div className="relative aspect-[4/3] bg-muted md:col-span-3 md:aspect-auto md:min-h-[320px]">
            {primary ? (
              <button
                type="button"
                onClick={() => setLightboxIndex(sorted.indexOf(primary))}
                className="group absolute inset-0 h-full w-full cursor-zoom-in"
                aria-label={primary.originalFileName}
              >
                <img
                  src={resolveApiAssetUrl(primary.url)}
                  alt={primary.originalFileName}
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                {sorted.length > 1 && (
                  <span className="absolute end-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {t("common.photoCount", { count: sorted.length })}
                  </span>
                )}
              </button>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm">{t("common.noImages")}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between gap-4 p-6 md:col-span-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                <span>{t("common.propertyId")}</span>
                <span className="font-mono text-foreground">#{p.id}</span>
              </div>
              <h2 className="font-display text-2xl font-semibold leading-tight">{p.name}</h2>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
                <span>{p.address}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Chip icon={<Home className="h-3.5 w-3.5" />}>{p.type}</Chip>
                <Chip icon={<CalendarDays className="h-3.5 w-3.5" />}>{formatDate(p.createdAt)}</Chip>
                {p.amenities && p.amenities.length > 0 && (
                  <Chip icon={<Sparkles className="h-3.5 w-3.5" />}>
                    {p.amenities.length} {t("nav.amenities").toLowerCase()}
                  </Chip>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sectioned cards — matching the intake form structure */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title={t("common.propertyDetails")} icon={<Info className="h-4 w-4" />}>
            <FieldGrid>
              <FieldItem icon={<Home className="h-4 w-4" />} label={t("common.name")} value={p.name} />
              <FieldItem icon={<MapPin className="h-4 w-4" />} label={t("common.address")} value={p.address} />
              <FieldItem icon={<Home className="h-4 w-4" />} label={t("common.type")} value={p.type} />
              <FieldItem
                icon={<Info className="h-4 w-4" />}
                label={t("common.status")}
                value={<StatusBadge tone={propertyStatusTone(p.status)}>{t(`propertyStatus.${p.status}`)}</StatusBadge>}
              />
              <FieldItem icon={<CalendarDays className="h-4 w-4" />} label={t("common.createdAt")} value={formatDate(p.createdAt)} />
              <FieldItem icon={<Hash className="h-4 w-4" />} label={t("common.propertyId")} value={`#${p.id}`} />
            </FieldGrid>
          </SectionCard>

          {contactEntries.length > 0 && (
            <SectionCard title={t("common.contactInformation")} icon={<User className="h-4 w-4" />}>
              <FieldGrid>
                {contactEntries.map(([k, v]) => (
                  <FieldItem
                    key={k}
                    icon={iconForKey(k)}
                    label={labelFor(k, t)}
                    value={renderValue(v, t)}
                    full={k === "notes"}
                  />
                ))}
              </FieldGrid>
            </SectionCard>
          )}

          {additionalEntries.length > 0 && (
            <SectionCard title={t("common.additionalInfo")} icon={<Info className="h-4 w-4" />}>
              <FieldGrid>
                {additionalEntries.map(([k, v]) => (
                  <FieldItem
                    key={k}
                    icon={iconForKey(k)}
                    label={labelFor(k, t)}
                    value={renderValue(v, t)}
                  />
                ))}
              </FieldGrid>
            </SectionCard>
          )}

          <SectionCard title={t("nav.amenities")} icon={<Sparkles className="h-4 w-4" />}>
            {p.amenities && p.amenities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {p.amenities.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/50 px-3 py-1 text-xs font-medium text-accent-foreground"
                    title={a.description}
                  >
                    <Sparkles className="h-3 w-3 text-gold" />
                    {a.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{t("common.none")}</span>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-1">
          {auth.isStaff && (
            <SectionCard title={t("common.ownerInformation")} icon={<User className="h-4 w-4" />}>
              <div className="space-y-3 text-sm">
                <FieldItem icon={<Hash className="h-4 w-4" />} label={t("common.ownerId")} value={`#${p.ownerId}`} full />
                {owner.data ? (
                  <>
                    <FieldItem icon={<User className="h-4 w-4" />} label={t("common.fullName")} value={owner.data.fullName} full />
                    <FieldItem icon={<Phone className="h-4 w-4" />} label={t("common.phone")} value={owner.data.phone} full />
                    <FieldItem icon={<Mail className="h-4 w-4" />} label={t("common.email")} value={owner.data.email} full />
                    <FieldItem icon={<IdCard className="h-4 w-4" />} label={t("common.nationalId")} value={owner.data.nationalId} full />
                  </>
                ) : owner.isLoading ? (
                  <div className="text-xs text-muted-foreground">{t("common.loading")}</div>
                ) : null}
              </div>
            </SectionCard>
          )}

          <div>
            <Link to="/app/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              {t("nav.properties")}
            </Link>
          </div>
        </div>
      </div>

      {/* Gallery section — matches the intake form's Photos section */}
      <div className="mt-6">
        <SectionCard
          title={t("common.gallery")}
          icon={<ImageIcon className="h-4 w-4" />}
          action={
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) upload.mutate(files);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              />
              <Button size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
                <Upload className="me-1 h-4 w-4" />
                {upload.isPending ? t("common.submitting") : t("common.upload")}
              </Button>
            </>
          }
          subtitle={sorted.length > 0 ? t("common.photoCount", { count: sorted.length }) : undefined}
        >
          {images.isLoading ? (
            <LoadingBlock />
          ) : sorted.length === 0 ? (
            <EmptyState icon={<ImagePlus className="h-6 w-6" />} message={t("common.noImages")} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {sorted.map((img, idx) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => setDragId(img.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropOnto(img.id)}
                    className={`group relative aspect-square overflow-hidden rounded-xl border bg-muted transition ${
                      dragId === img.id ? "border-gold ring-2 ring-gold/40" : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="absolute inset-0 h-full w-full cursor-zoom-in"
                      aria-label={img.originalFileName}
                    >
                      <img
                        src={resolveApiAssetUrl(img.url)}
                        alt={img.originalFileName}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        loading="lazy"
                      />
                    </button>
                    {img.isPrimary && (
                      <span className="pointer-events-none absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold-gradient px-2 py-0.5 text-xs font-medium text-gold-foreground shadow-gold">
                        <Star className="h-3 w-3 fill-current" />
                        {t("common.primary")}
                      </span>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      {!img.isPrimary && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="pointer-events-auto h-7 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); setPrimary.mutate(img.id); }}
                        >
                          <Star className="me-1 h-3 w-3" /> {t("common.setPrimary")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="pointer-events-auto h-7 px-2 text-xs"
                        onClick={(e) => { e.stopPropagation(); delImg.mutate(img.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {sorted.length > 1 && (
                <p className="mt-3 text-xs text-muted-foreground">{t("common.dragToReorder")}</p>
              )}
            </>
          )}
        </SectionCard>
      </div>

      {lightboxIndex !== null && sorted[lightboxIndex] && (
        <Lightbox
          images={sorted}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
}

/* -------------------- helpers & sub-components -------------------- */

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
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  try { return JSON.stringify(v); } catch { return String(v); }
}

function SectionCard({
  title, subtitle, icon, action, children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-gradient text-gold-foreground shadow-gold">
              {icon}
            </span>
          )}
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function FieldItem({
  icon, label, value, full,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-border bg-background/40 p-3 ${full ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 break-words text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground">
      {icon}
      {children}
    </span>
  );
}

function Lightbox({
  images, index, onClose, onChange,
}: {
  images: PropertyImage[]; index: number; onClose: () => void; onChange: (i: number) => void;
}) {
  const { t } = useTranslation();
  const img = images[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onChange((index + 1) % images.length);
      else if (e.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, images.length, onChange, onClose]);

  if (!img) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label={t("common.close")}
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange((index - 1 + images.length) % images.length); }}
            className="absolute start-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 rtl:rotate-180"
            aria-label={t("common.previous")}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange((index + 1) % images.length); }}
            className="absolute end-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 rtl:rotate-180"
            aria-label={t("common.next")}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <figure
        className="flex max-h-full max-w-6xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={resolveApiAssetUrl(img.url)}
          alt={img.originalFileName}
          className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
        <figcaption className="mt-3 flex items-center gap-3 text-sm text-white/80">
          <span>{img.originalFileName}</span>
          <span className="text-white/40">·</span>
          <span>{index + 1} / {images.length}</span>
          {img.isPrimary && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-gradient px-2 py-0.5 text-xs font-medium text-gold-foreground">
              <Star className="h-3 w-3 fill-current" />
              {t("common.primary")}
            </span>
          )}
        </figcaption>
      </figure>
    </div>
  );
}
