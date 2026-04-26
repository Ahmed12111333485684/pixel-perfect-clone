import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, resolveApiAssetUrl, type PropertyDto, type PropertyImage, type PropertyStatus, type Owner } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatusBadge, LoadingBlock, ErrorBlock, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Trash2, Upload, ImagePlus, X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { propertyStatusTone, formatDate } from "@/lib/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/properties/$id")({
  component: PropertyDetail,
});

const STATUSES: PropertyStatus[] = ["Pending", "Approved", "Rejected", "Sold"];

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
    mutationFn: (status: PropertyStatus) =>
      api(`/api/properties/${propId}/status`, { method: "PUT", body: { status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["property", propId] }); qc.invalidateQueries({ queryKey: ["properties"] }); toast.success(t("common.updated")); },
    onError: (e: Error) => toast.error(e.message),
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sorted = (images.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);

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

  // Show every field on the DTO, including any extra/optional ones the API may return.
  const knownKeys = new Set(["id", "ownerId", "name", "address", "type", "status", "createdAt", "amenities"]);
  const extraEntries = Object.entries(p as Record<string, unknown>).filter(
    ([k, v]) => !knownKeys.has(k) && v !== null && v !== undefined && v !== ""
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
          <div className="flex items-center gap-2">
            <StatusBadge tone={propertyStatusTone(p.status)}>{t(`propertyStatus.${p.status}`)}</StatusBadge>
            {auth.isStaff && (
              <Select value={p.status} onValueChange={(v) => updateStatus.mutate(v as PropertyStatus)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`propertyStatus.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/app/properties/${propId}`, "_blank", "noopener,noreferrer")}
              title={t("common.openInNewTab")}
            >
              <ExternalLink className="me-1 h-4 w-4" />
              {t("common.openInNewTab")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          {/* Property information */}
          <div className="space-y-1 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t("common.information")}</div>
            <DetailRow label={t("common.propertyId")} value={`#${p.id}`} />
            <DetailRow label={t("common.name")} value={p.name} />
            <DetailRow label={t("common.address")} value={p.address} />
            <DetailRow label={t("common.type")} value={p.type} />
            <DetailRow label={t("common.status")} value={
              <StatusBadge tone={propertyStatusTone(p.status)}>{t(`propertyStatus.${p.status}`)}</StatusBadge>
            } />
            <DetailRow label={t("common.createdAt")} value={formatDate(p.createdAt)} />
            {extraEntries.map(([k, v]) => (
              <DetailRow
                key={k}
                label={humanizeKey(k)}
                value={renderValue(v)}
              />
            ))}
          </div>

          {/* Owner */}
          <div className="space-y-1 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t("nav.owners")}</div>
            <DetailRow label={t("common.ownerId")} value={`#${p.ownerId}`} />
            {auth.isStaff && owner.data && (
              <>
                <DetailRow label={t("common.fullName")} value={owner.data.fullName} />
                <DetailRow label={t("common.phone")} value={owner.data.phone} />
                <DetailRow label={t("common.email")} value={owner.data.email} />
                <DetailRow label={t("common.nationalId")} value={owner.data.nationalId} />
              </>
            )}
          </div>

          {/* Amenities */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">{t("nav.amenities")}</div>
            {p.amenities && p.amenities.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {p.amenities.map((a) => (
                  <span
                    key={a.id}
                    className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground"
                    title={a.description}
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{t("common.none")}</span>
            )}
          </div>

          <div>
            <Link to="/app/properties" className="text-sm text-muted-foreground hover:text-foreground">
              ← {t("nav.properties")}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">
              {t("common.images")} {sorted.length > 0 && <span className="ms-2 text-sm text-muted-foreground">({sorted.length})</span>}
            </h3>
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
          </div>

          {images.isLoading ? <LoadingBlock /> :
            sorted.length === 0 ? (
              <EmptyState icon={<ImagePlus className="h-6 w-6" />} title={t("common.noImages")} />
            ) : (
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
            )}
          {sorted.length > 1 && (
            <p className="mt-3 text-xs text-muted-foreground">{t("common.dragToReorder")}</p>
          )}
        </div>
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium break-words">{value}</span>
    </div>
  );
}

function humanizeKey(k: string) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function renderValue(v: unknown): React.ReactNode {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number" || typeof v === "string") {
    const s = String(v);
    // ISO date detection
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(s)) {
      return formatDate(s);
    }
    return s;
  }
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
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
