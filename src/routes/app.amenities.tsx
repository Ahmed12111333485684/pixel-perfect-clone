import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, deleteAmenityPhoto, resolveApiAssetUrl, type Amenity } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { MediaPreview } from "@/components/MediaPreview";
import { MediaLightbox } from "@/components/MediaLightbox";
import { FileManager, type PhotoDraft } from "@/components/FileManager";
import { ImagePlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/amenities")({
  component: AmenitiesPage,
});

function AmenitiesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["amenities"],
    queryFn: () => api<Amenity[]>("/amenities"),
  });
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Amenity | null>(null);
  const [search, setSearch] = useState("");
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft>({ files: [], removedUrls: [] });
  const [lightboxImages, setLightboxImages] = useState<{ src: string; alt: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setPhotoDraft({ files: [], removedUrls: [] });
  }, [creating, editing]);

  const openLightbox = (amenity: Amenity, startIndex: number) => {
    setLightboxImages(
      (amenity.photoUrls ?? []).map((url) => ({ src: resolveApiAssetUrl(url), alt: amenity.name })),
    );
    setLightboxIndex(startIndex);
  };

  const upsert = useMutation({
    mutationFn: async (vals: {
      id?: number;
      name: string;
      description?: string;
      photos?: File[] | null;
      removePhotoUrls?: string[] | null;
    }) => {
      const fd = new FormData();
      fd.append("name", vals.name);
      if (vals.description) fd.append("description", vals.description);
      for (const photo of vals.photos ?? []) fd.append("photos", photo);

      if (vals.id) {
        await api(`/api/amenities/${vals.id}`, { method: "PUT", formData: fd });
        for (const url of vals.removePhotoUrls ?? []) {
          await deleteAmenityPhoto(vals.id, url);
        }
        return;
      }
      await api("/amenities", { method: "POST", formData: fd });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["amenities"] });
      toast.success(t("common.success"));
      setEditing(null);
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/api/amenities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["amenities"] });
      toast.success(t("common.deleted"));
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: Column<Amenity>[] = [
    {
      key: "photo",
      header: t("common.photo"),
      className: "w-20",
      cell: (r) =>
        r.photoUrls?.length ? (
          <div
            className="h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted"
            style={{ cursor: "zoom-in" }}
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(r, 0);
            }}
          >
            <MediaPreview
              src={resolveApiAssetUrl(r.photoUrls[0])}
              alt={r.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <ImagePlus className="h-4 w-4" />
          </div>
        ),
    },
    {
      key: "name",
      header: t("common.name"),
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "desc",
      header: t("common.description"),
      cell: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span>,
    },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt) },
  ];

  const filteredAmenities = useMemo(() => {
    if (!search.trim()) return list.data ?? [];
    const lowerSearch = search.toLowerCase();
    return (list.data ?? []).filter((amenity) => {
      const nameMatch = amenity.name.toLowerCase().includes(lowerSearch);
      const descriptionMatch = (amenity.description ?? "").toLowerCase().includes(lowerSearch);
      return nameMatch || descriptionMatch;
    });
  }, [list.data, search]);

  return (
    <div>
      <PageHeader
        title={t("nav.amenities")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="me-1 h-4 w-4" />
            {t("common.add")}
          </Button>
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
      <DataTable
        columns={cols}
        rows={filteredAmenities}
        loading={list.isLoading}
        error={list.error}
        rowKey={(r) => r.id}
        onEdit={setEditing}
        onDelete={setDeleting}
      />
      <FormDialog
        key={`${editing?.id ?? "new"}-${creating ? "create" : "edit"}`}
        open={creating || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
        title={editing ? t("common.edit") : t("common.add")}
        submitting={upsert.isPending}
        size="lg"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          upsert.mutate({
            id: editing?.id,
            name: String(fd.get("name") ?? ""),
            description: String(fd.get("description") ?? "") || undefined,
            photos: photoDraft.files,
            removePhotoUrls: photoDraft.removedUrls,
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t("common.name")}</Label>
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("common.description")}</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={editing?.description ?? ""}
              rows={3}
            />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-4">
            <FileManager
              urls={editing?.photoUrls ?? []}
              alt={editing?.name ?? ""}
              onDraftChange={setPhotoDraft}
            />
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`${t("common.delete")}: ${deleting?.name ?? ""}`}
        destructive
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <MediaLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
