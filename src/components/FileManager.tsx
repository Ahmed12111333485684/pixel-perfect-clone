import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveApiAssetUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Trash2, Upload, FileImage } from "lucide-react";
import { MediaPreview } from "@/components/MediaPreview";
import { MediaLightbox } from "@/components/MediaLightbox";
import { isAcceptedMediaFile } from "@/lib/media";
import { toast } from "sonner";

export type MediaDraft = {
  files: File[];
  removedUrls: string[];
};

export type PhotoDraft = MediaDraft;

type StagedFile = {
  id: number;
  file: File;
  url: string;
};

function deriveFileName(url: string): string {
  const clean = url.split(/[?#]/)[0].split("/").pop();
  if (!clean) return "";
  try {
    return decodeURIComponent(clean);
  } catch {
    return clean;
  }
}

export const DEFAULT_MEDIA_ACCEPT = "image/*,video/*,.pdf,.docx";

export function FileManager({
  urls,
  alt,
  onDraftChange,
  readOnly = false,
  accept = DEFAULT_MEDIA_ACCEPT,
  multiple = true,
  title,
  hideTitle = false,
}: {
  urls: string[];
  alt: string;
  onDraftChange: (draft: MediaDraft) => void;
  readOnly?: boolean;
  accept?: string;
  multiple?: boolean;
  title?: string;
  hideTitle?: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [removedUrls, setRemovedUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const nextIdRef = useRef(1);
  const stagedRef = useRef<StagedFile[]>([]);
  stagedRef.current = staged;

  useEffect(() => {
    return () => {
      stagedRef.current.forEach((s) => URL.revokeObjectURL(s.url));
    };
  }, []);

  const keptUrls = urls.filter((url) => !removedUrls.includes(url));
  const items = [
    ...keptUrls.map((url) => ({ key: url, src: resolveApiAssetUrl(url), isFile: false, fileName: deriveFileName(url) })),
    ...staged.map((s) => ({ key: `f-${s.id}`, src: s.url, isFile: true, fileName: s.file.name })),
  ];

  const emitDraft = () => {
    onDraftChange({
      files: staged.map((s) => s.file),
      removedUrls,
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of files) {
      if (isAcceptedMediaFile(file)) accepted.push(file);
      else rejected.push(file.name);
    }

    if (rejected.length > 0) {
      toast.error(`${t("common.unsupportedFileType")}: ${rejected.join(", ")}`);
    }

    if (accepted.length > 0) {
      setStaged((current) => [
        ...current,
        ...accepted.map((file) => ({ id: nextIdRef.current++, file, url: URL.createObjectURL(file) })),
      ]);
    }
  };

  const removeItem = (index: number) => {
    const item = items[index];
    if (item.isFile) {
      setStaged((current) => {
        const entry = current.find((s) => `f-${s.id}` === item.key);
        if (entry) URL.revokeObjectURL(entry.url);
        return current.filter((s) => `f-${s.id}` !== item.key);
      });
    } else {
      const url = urls.find((u) => resolveApiAssetUrl(u) === item.src);
      if (url) setRemovedUrls((current) => (current.includes(url) ? current : [...current, url]));
    }
  };

  useEffect(() => {
    emitDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staged, removedUrls]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideTitle && (
          <h3 className="text-sm font-medium">{title ?? t("common.images")}</h3>
        )}
        {!readOnly && (
          <div className={hideTitle ? "ms-auto" : undefined}>
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              <span className="ms-1">{t("common.uploadMedia")}</span>
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        )}
      </div>

      {items.length === 0 ? (
        !hideTitle && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
            <FileImage className="mb-2 h-8 w-8 opacity-20" />
            <p className="text-sm">{t("common.noMediaAttached")}</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => (
            <div
              key={item.key}
              className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
              style={{ cursor: "zoom-in" }}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(index);
              }}
            >
              <MediaPreview
                src={item.src}
                alt={alt}
                fileName={item.fileName || alt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {!readOnly && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-end bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeItem(index);
                    }}
                    className="rounded-full p-1.5 text-white/70 transition-colors hover:text-red-400"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && items[lightboxIndex] && (
        <MediaLightbox
          images={items.map((item) => ({
            src: item.src,
            alt,
            fileName: item.fileName || alt,
          }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
