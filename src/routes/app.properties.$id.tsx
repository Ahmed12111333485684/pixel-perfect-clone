import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type PropertyDto, type PropertyImage, type PropertyStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatusBadge, LoadingBlock, ErrorBlock, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Trash2, Upload, ImagePlus } from "lucide-react";
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
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("common.details")}</div>
          <DetailRow label={t("common.type")} value={p.type} />
          <DetailRow label={t("nav.owners")} value={`#${p.ownerId}`} />
          <DetailRow label={t("common.createdAt")} value={formatDate(p.createdAt)} />
          {p.amenities && p.amenities.length > 0 && (
            <div className="pt-2">
              <div className="mb-1 text-xs text-muted-foreground">{t("nav.amenities")}</div>
              <div className="flex flex-wrap gap-1.5">
                {p.amenities.map((a) => (
                  <span key={a.id} className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground">{a.name}</span>
                ))}
              </div>
            </div>
          )}
          <div className="pt-3">
            <Link to="/app/properties" className="text-sm text-muted-foreground hover:text-foreground">
              ← {t("nav.properties")}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">{t("common.images")}</h3>
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
              <EmptyState icon={<ImagePlus className="h-6 w-6" />} />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {sorted.map((img) => (
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
                    <img
                      src={img.url}
                      alt={img.originalFileName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {img.isPrimary && (
                      <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold-gradient px-2 py-0.5 text-xs font-medium text-gold-foreground shadow-gold">
                        <Star className="h-3 w-3 fill-current" />
                        {t("common.primary")}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      {!img.isPrimary && (
                        <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setPrimary.mutate(img.id)}>
                          <Star className="me-1 h-3 w-3" /> {t("common.setPrimary")}
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => delImg.mutate(img.id)}>
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
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
