import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CommercialListingImage, uploadCommercialListingImage, deleteCommercialListingImage, setPrimaryCommercialListingImage } from "@/lib/api";
import { resolveApiAssetUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Star, Trash2, FileImage } from "lucide-react";
import { MediaPreview } from "@/components/MediaPreview";
import { FileManager, type MediaDraft } from "@/components/FileManager";
import { toast } from "sonner";

export function CommercialListingImageManager({
  listingId,
  images,
  onChange,
  readOnly = false,
  onImageZoom,
}: {
  listingId: number;
  images: CommercialListingImage[];
  onChange: () => void;
  readOnly?: boolean;
  onImageZoom?: (index: number) => void;
}) {
  const { t } = useTranslation();
  const [stagedDraft, setStagedDraft] = useState<MediaDraft>({ files: [], removedUrls: [] });
  const [saveKey, setSaveKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (stagedDraft.files.length === 0) return;
    setSaving(true);
    try {
      for (const file of stagedDraft.files) {
        await uploadCommercialListingImage(listingId, file, images.length === 0);
      }
      onChange();
      setStagedDraft({ files: [], removedUrls: [] });
      setSaveKey((k) => k + 1);
      toast.success(t("common.success"));
    } catch (err) {
      console.error("Upload failed", err);
      toast.error(t("common.failedUploadImage"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm(t("common.confirmDeleteImage"))) return;
    try {
      await deleteCommercialListingImage(listingId, imageId);
      onChange();
    } catch (err) {
      console.error("Delete failed", err);
      toast.error(t("common.failedDeleteImage"));
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    try {
      await setPrimaryCommercialListingImage(listingId, imageId);
      onChange();
    } catch (err) {
      console.error("Set primary failed", err);
      toast.error(t("common.failedSetPrimaryImage"));
    }
  };

  return (
    <div className="space-y-4">
      <FileManager
        key={saveKey}
        urls={[]}
        alt=""
        onDraftChange={setStagedDraft}
        readOnly={readOnly}
        hideTitle
      />
      {!readOnly && stagedDraft.files.length > 0 && (
        <div>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.saveChanges")}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("common.images")}</h3>
      </div>

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
          <FileImage className="mb-2 h-8 w-8 opacity-20" />
          <p className="text-sm">{t("common.noImagesAttached")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, index) => {
            const url = resolveApiAssetUrl(img.url);
            return (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-md border bg-muted cursor-zoom-in"
                onClick={onImageZoom ? (e) => { e.stopPropagation(); onImageZoom(index); } : undefined}
              >
                <MediaPreview
                  src={url}
                  alt={img.originalFileName}
                  fileName={img.originalFileName}
                  mimeType={img.mimeType}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {!readOnly && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSetPrimary(img.id); }}
                      className={`rounded-full p-1.5 transition-colors ${img.isPrimary ? "text-yellow-400 hover:text-yellow-300" : "text-white/70 hover:text-white"}`}
                      title="Set as primary"
                    >
                      <Star className={`h-4 w-4 ${img.isPrimary ? "fill-current" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(img.id); }}
                      className="rounded-full p-1.5 text-white/70 transition-colors hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {img.isPrimary && (
                  <div className="absolute left-2 top-2 rounded-md bg-yellow-400/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-950">
                    Primary
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
