import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveApiAssetUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Trash2, Upload, FileImage, Loader2 } from "lucide-react";
import { MediaPreview } from "@/components/MediaPreview";

export function PhotoManager({
  urls,
  alt,
  onUpload,
  onDelete,
  onZoom,
  readOnly = false,
}: {
  urls: string[];
  alt: string;
  onUpload: (file: File) => Promise<void> | void;
  onDelete: (url: string) => Promise<void> | void;
  onZoom?: (index: number) => void;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } catch {
      // caller reports errors
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (url: string) => {
    if (!confirm(t("common.confirmDeleteImage"))) return;
    setDeleting(url);
    try {
      await onDelete(url);
    } catch {
      // caller reports errors
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("common.images")}</h3>
        {!readOnly && (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ms-1">
                {uploading ? t("common.uploading") : t("common.uploadImage")}
              </span>
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        )}
      </div>

      {urls.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
          <FileImage className="mb-2 h-8 w-8 opacity-20" />
          <p className="text-sm">{t("common.noImagesAttached")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {urls.map((url, index) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
              style={onZoom ? { cursor: "zoom-in" } : undefined}
              onClick={onZoom ? (e) => { e.stopPropagation(); onZoom(index); } : undefined}
            >
              <MediaPreview
                src={resolveApiAssetUrl(url)}
                alt={alt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {!readOnly && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-end bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(url); }}
                    disabled={deleting === url}
                    className="rounded-full p-1.5 text-white/70 transition-colors hover:text-red-400 disabled:opacity-50"
                    title={t("common.delete")}
                  >
                    {deleting === url ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
