import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  getApiBaseUrl,
  resolveApiAssetUrl,
  type Lead,
  type LeadIntent,
  type LeadStatus,
  type CommercialListing,
} from "@/lib/api";
import {
  PageHeader,
  StatusBadge,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
} from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { MediaPreview } from "@/components/MediaPreview";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileImage,
  Home,
  Inbox,
  Mail,
  MapPin,
  Phone,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { leadStatusTone, formatDateTime } from "@/lib/format";
import { localizePropertyType } from "@/lib/property-types";
import { toast } from "sonner";

const INTENTS: LeadIntent[] = ["Buy", "Rent", "Sell", "LetOut"];
const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "ClosedLost", "ClosedWon"];

export const Route = createFileRoute("/app/leads")({ component: LeadsPage });

function useAuthenticatedMedia(src: string) {
  const [media, setMedia] = useState<{ src: string; mimeType?: string } | null>(null);

  useEffect(() => {
    let objectUrl: string | undefined;
    api<Blob>(src.replace(getApiBaseUrl(), ""), { asBlob: true })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setMedia({ src: objectUrl, mimeType: blob.type || undefined });
      })
      .catch(() => setMedia(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return media;
}

function AuthMedia({
  src,
  alt,
  className,
  mimeType,
  controls,
}: {
  src: string;
  alt: string;
  className?: string;
  mimeType?: string;
  controls?: boolean;
}) {
  const media = useAuthenticatedMedia(src);
  if (!media) return <FileImage className="h-4 w-4 text-muted-foreground" />;
  return (
    <MediaPreview
      src={media.src}
      alt={alt}
      mimeType={mimeType ?? media.mimeType}
      className={className}
      controls={controls}
    />
  );
}

function LeadLightbox({
  images,
  index,
  onClose,
  onChange,
}: {
  images: { src: string; alt: string; mimeType?: string }[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange((index - 1 + images.length) % images.length);
            }}
            className="absolute start-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 rtl:rotate-180"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange((index + 1) % images.length);
            }}
            className="absolute end-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 rtl:rotate-180"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <figure
        className="flex max-h-full max-w-6xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <AuthMedia
          src={img.src}
          alt={img.alt}
          mimeType={img.mimeType}
          className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
          controls
        />
        <figcaption className="mt-3 flex items-center gap-3 text-sm text-white/80">
          <span>{img.alt}</span>
          <span className="text-white/40">·</span>
          <span>
            {index + 1} / {images.length}
          </span>
        </figcaption>
      </figure>
    </div>
  );
}

function LeadsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [intent, setIntent] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [approving, setApproving] = useState<Lead | null>(null);
  const [lightboxImages, setLightboxImages] = useState<
    { src: string; alt: string; mimeType?: string }[]
  >([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const list = useQuery({
    queryKey: ["leads"],
    queryFn: () => api<Lead[]>("/leads"),
  });

  const update = useMutation({
    mutationFn: (vals: {
      id: number;
      status?: LeadStatus;
      notes?: string;
      listedPrice?: number;
      commissionAmount?: number | null;
      commissionStatus?: string | null;
      commissionNotes?: string | null;
    }) => api(`/api/leads/${vals.id}`, { method: "PUT", body: vals }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(t("common.updated"));
      setEditing(null);
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: (id: number) =>
      api<{ listingId: number }>(`/api/leads/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success(t("common.leadApproved"));
      setApproving(null);
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedListing = useQuery({
    queryKey: ["lead-listing", selected?.commercialListingId],
    queryFn: () => api<CommercialListing>(`/api/commercial-listings/${selected?.commercialListingId}`),
    enabled: !!selected?.commercialListingId,
  });

  const filteredLeads = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return (list.data ?? []).filter((lead) => {
      const intentMatch = intent === "all" || lead.intent === intent;
      const statusMatch = status === "all" || lead.status === status;
      if (!lowerSearch) return intentMatch && statusMatch;

      const searchMatch = [
        lead.propertyName,
        lead.propertyAddress,
        lead.fullName,
        lead.phone,
        lead.email,
        lead.ownerNationalId,
        lead.partnerName,
        lead.propertyId == null ? "" : String(lead.propertyId),
        lead.commercialListingId == null ? "" : String(lead.commercialListingId),
        lead.city,
        lead.district,
      ].some((value) => !!value && value.toLowerCase().includes(lowerSearch))
      // .some((value) => value.toLowerCase().includes(lowerSearch));

      return intentMatch && statusMatch && searchMatch;
    });
  }, [list.data, intent, search, status]);

  const grouped = useMemo(() => {
    const m: Record<LeadStatus, Lead[]> = {
      New: [],
      Contacted: [],
      Qualified: [],
      ClosedLost: [],
      ClosedWon: [],
    };
    filteredLeads.forEach((lead) => m[lead.status].push(lead));
    return m;
  }, [filteredLeads]);

  const openLightbox = (lead: Lead, startIndex: number) => {
    setLightboxImages(
      (lead.images ?? []).map((i) => ({
        src: resolveApiAssetUrl(`/api/leads/${lead.id}/images/${i.id}/file`),
        alt: i.originalFileName,
        mimeType: i.mimeType,
      })),
    );
    setLightboxIndex(startIndex);
  };

  return (
    <div>
      <PageHeader
        title={t("nav.leads")}
        actions={
          <div className="flex items-center gap-2">
            <Select value={intent} onValueChange={setIntent}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {INTENTS.map((i) => (
                  <SelectItem key={i} value={i}>
                    {t(`intent.${i}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`leadStatus.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="mb-4">
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {list.isLoading ? (
        <LoadingBlock />
      ) : list.error ? (
        <ErrorBlock message={(list.error as Error).message} />
      ) : filteredLeads.length === 0 ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {STATUSES.map((s) => (
            <div key={s} className="rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{t(`leadStatus.${s}`)}</span>
                <StatusBadge tone={leadStatusTone(s)}>{grouped[s].length}</StatusBadge>
              </div>
              <div className="space-y-2">
                {grouped[s].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelected(l)}
                    className="block w-full rounded-lg border border-border bg-background p-3 text-start transition hover:border-gold hover:shadow-card"
                  >
                    <div className="text-sm font-medium">{l.propertyName}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {l.fullName} · {t(`intent.${l.intent}`)}
                    </div>
                    {l.partnerId && (
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">
                        Partner: {l.partnerName ?? "—"}
                      </div>
                    )}
                    {l.commercialListingId && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <Home className="h-3 w-3" />
                        {t("common.listingId")}: #{l.commercialListingId}
                      </div>
                    )}
                  </button>
                ))}
                {grouped[s].length === 0 && (
                  <p className="px-1 py-2 text-xs text-muted-foreground">{t("common.empty")}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lead detail drawer-like dialog */}
      <FormDialog
        open={!!selected && lightboxIndex === null}
        onOpenChange={(v) => !v && setSelected(null)}
        title={selected?.propertyName ?? ""}
        description={selected?.propertyAddress}
        size="lg"
        submitLabel={t("common.close") ?? "Close"}
        onSubmit={(e) => {
          e.preventDefault();
          setSelected(null);
        }}
      >
        {selected && (
          <div className="space-y-4">
            {/* Status & Intent Badges */}
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={leadStatusTone(selected.status)}>
                {t(`leadStatus.${selected.status}`)}
              </StatusBadge>
              <StatusBadge tone="info">{t(`intent.${selected.intent}`)}</StatusBadge>
            </div>

            {/* Submitted Property Section */}
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("common.submittedProperty")}
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.name")}:
                  </span>
                  <div className="font-medium">
                    {selected.propertyName || t("common.notProvided")}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.address")}:
                  </span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{selected.propertyAddress || t("common.notProvided")}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.type")}:
                  </span>
                  <div className="flex items-center gap-2">
                    <Home className="h-3.5 w-3.5" />
                    <span>{localizePropertyType(t, selected.propertyType)}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.intent")}:
                  </span>
                  <div>{t(`intent.${selected.intent}`)}</div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {selected.intent === "Rent" || selected.intent === "LetOut"
                      ? t("common.monthlyRent")
                      : t("common.salePrice")}
                    :
                  </span>
                  <div className="font-medium">
                    {selected.listedPrice
                      ? new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: "USD",
                      }).format(selected.listedPrice)
                      : t("common.notProvided")}
                  </div>
                </div>
                {selected.city && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("common.city")}:
                    </span>
                    <div>{selected.city}</div>
                  </div>
                )}
                {selected.district && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("common.district")}:
                    </span>
                    <div>{selected.district}</div>
                  </div>
                )}
                {selected.commercialListingId && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("common.listingId")}:
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">#{selected.commercialListingId}</span>
                      <Link
                        to="/app/listings/$id"
                        params={{ id: String(selected.commercialListingId) }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("common.open")}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              {selected.commercialListingId && selectedListing.data && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {t("common.linkedListing")}
                  </div>
                  <div className="space-y-1 text-xs bg-background rounded p-2">
                    <div className="font-medium">{selectedListing.data.ownerName}</div>
                    <div>{selectedListing.data.location}</div>
                    <div className="text-muted-foreground">{selectedListing.data.propertyType}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Section */}
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("common.contact")}
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.fullName")}:
                  </span>
                  <div className="font-medium">{selected.fullName || t("common.notProvided")}</div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.phone")}:
                  </span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {selected.phone || t("common.notProvided")}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.email")}:
                  </span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {selected.email || t("common.notProvided")}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.nationalId")}:
                  </span>
                  <div className="font-mono text-xs">
                    {selected.ownerNationalId || t("common.notProvided")}
                  </div>
                </div>
                {selected.partnerId && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Partner:</span>
                    <div>{selected.partnerName ?? t("common.notProvided")}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Timing Section */}
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("common.timing")}
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.submittedAt")}:
                  </span>
                  <div>{formatDateTime(selected.createdAt)}</div>
                </div>
                {selected.preferredContactAt && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("common.preferredContactAt")}:
                    </span>
                    <div>{formatDateTime(selected.preferredContactAt)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            {selected.notes && (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("common.notes")}
                </h3>
                <div className="text-sm">{selected.notes}</div>
              </div>
            )}

            {/* Submitted Images Section */}
            {selected.images && selected.images.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("common.submittedImages")}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {selected.images.map((img, idx) => {
                    const src = resolveApiAssetUrl(
                      `/api/leads/${selected.id}/images/${img.id}/file`,
                    );
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => openLightbox(selected, idx)}
                        className="group relative overflow-hidden rounded-md border border-border bg-muted aspect-square flex items-center justify-center hover:bg-muted/80 transition-colors cursor-zoom-in"
                      >
                        <AuthMedia
                          src={src}
                          alt={img.originalFileName}
                          mimeType={img.mimeType}
                          className="h-full w-full object-cover group-hover:opacity-75"
                          controls={false}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-4 w-4 text-white" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(selected)}>
                {t("common.edit")}
              </Button>
              {selected.status !== "ClosedWon" && (
                <Button
                  size="sm"
                  className="bg-gold-gradient text-gold-foreground"
                  onClick={() => setApproving(selected)}
                >
                  <CheckCircle2 className="me-1 h-4 w-4" />
                  {t("common.approveLead")}
                </Button>
              )}
            </div>
          </div>
        )}
      </FormDialog>

      <FormDialog
        key={`${editing?.id ?? "none"}-${!!editing}`}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={t("common.edit")}
        submitting={update.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          if (!editing) return;
          const fd = new FormData(e.currentTarget);
          update.mutate({
            id: editing.id,
            status: String(fd.get("status") ?? editing.status) as LeadStatus,
            listedPrice: Number(fd.get("listedPrice") ?? editing.listedPrice ?? 0),
            notes: String(fd.get("notes") ?? "") || undefined,
            commissionAmount: editing.partnerId
              ? (() => {
                const value = String(fd.get("commissionAmount") ?? "").trim();
                if (!value) return null;
                const parsed = Number(value);
                return Number.isNaN(parsed) ? null : parsed;
              })()
              : undefined,
            commissionStatus: editing.partnerId
              ? String(fd.get("commissionStatus") ?? "").trim() || null
              : undefined,
            commissionNotes: editing.partnerId
              ? String(fd.get("commissionNotes") ?? "").trim() || null
              : undefined,
          });
        }}
      >
        {editing && (
          <>
            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select name="status" defaultValue={editing.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`leadStatus.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="status" defaultValue={editing.status} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t("common.notes")}</Label>
              <Textarea id="notes" name="notes" rows={4} defaultValue={editing.notes ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="listedPrice">
                {editing.intent === "Rent" || editing.intent === "LetOut"
                  ? t("common.monthlyRent")
                  : t("common.salePrice")}
              </Label>
              <Input
                id="listedPrice"
                name="listedPrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editing.listedPrice ?? ""}
                required
              />
            </div>
            {editing.partnerId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="commissionAmount">Commission amount</Label>
                  <Input
                    id="commissionAmount"
                    name="commissionAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editing.commissionAmount ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commissionStatus">Commission status</Label>
                  <Input
                    id="commissionStatus"
                    name="commissionStatus"
                    placeholder="Pending or Paid"
                    defaultValue={editing.commissionStatus ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commissionNotes">Commission notes</Label>
                  <Textarea
                    id="commissionNotes"
                    name="commissionNotes"
                    rows={3}
                    defaultValue={editing.commissionNotes ?? ""}
                  />
                </div>
              </>
            )}
          </>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!approving}
        onOpenChange={(v) => !v && setApproving(null)}
        title={t("common.approveLead")}
        description={approving?.propertyName}
        confirmLabel={t("common.approve")}
        loading={approve.isPending}
        onConfirm={() => approving && approve.mutate(approving.id)}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <LeadLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
