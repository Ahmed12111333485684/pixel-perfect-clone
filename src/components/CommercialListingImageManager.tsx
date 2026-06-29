import React, { useState } from "react";
import { CommercialListingImage, uploadCommercialListingImage, deleteCommercialListingImage, setPrimaryCommercialListingImage } from "@/lib/api";
import { resolveApiAssetUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Star, Trash2, Upload, FileImage } from "lucide-react";
import { MediaPreview } from "@/components/MediaPreview";

export function CommercialListingImageManager({
  listingId,
  images,
  onChange,
  readOnly = false,
}: {
  listingId: number;
  images: CommercialListingImage[];
  onChange: () => void;
  readOnly?: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    try {
      await uploadCommercialListingImage(listingId, file, images.length === 0);
      onChange();
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    try {
      await deleteCommercialListingImage(listingId, imageId);
      onChange();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete image");
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    try {
      await setPrimaryCommercialListingImage(listingId, imageId);
      onChange();
    } catch (err) {
      console.error("Set primary failed", err);
      alert("Failed to set primary image");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Images</h3>
        {!readOnly && (
          <div>
            <label className={`flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Image"}
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        )}
      </div>

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
          <FileImage className="mb-2 h-8 w-8 opacity-20" />
          <p className="text-sm">No images attached</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => {
            const url = resolveApiAssetUrl(img.url);
            return (
              <div key={img.id} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                <MediaPreview
                  src={url}
                  alt={img.originalFileName}
                  fileName={img.originalFileName}
                  mimeType={img.mimeType}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  zoomable
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
