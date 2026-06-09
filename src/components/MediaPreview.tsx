import { useState, useEffect } from "react";
import { isVideoAsset } from "@/lib/media";
import { X } from "lucide-react";

type MediaPreviewProps = {
  src: string;
  alt: string;
  fileName?: string | null;
  mimeType?: string | null;
  className?: string;
  loading?: "eager" | "lazy";
  controls?: boolean;
  zoomable?: boolean;
};

export function MediaPreview({
  src,
  alt,
  fileName,
  mimeType,
  className,
  loading,
  controls = false,
  zoomable = false,
}: MediaPreviewProps) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (zoomed) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setZoomed(false);
      };
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [zoomed]);

  const isVideo = isVideoAsset({ fileName, mimeType, url: src });

  const content = isVideo ? (
    <video
      src={src}
      title={alt}
      className={className}
      controls={controls}
      playsInline
      preload="metadata"
      onClick={
        zoomable
          ? (e) => {
              e.stopPropagation();
              setZoomed(true);
            }
          : undefined
      }
      style={zoomable ? { cursor: "zoom-in" } : undefined}
    />
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onClick={
        zoomable
          ? (e) => {
              e.stopPropagation();
              setZoomed(true);
            }
          : undefined
      }
      style={zoomable ? { cursor: "zoom-in" } : undefined}
    />
  );

  return (
    <>
      {content}
      {zoomed && zoomable && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed(false);
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(false);
            }}
            className="absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {isVideo ? (
            <video
              src={src}
              title={alt}
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
              controls
              autoPlay
            />
          ) : (
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
          )}
        </div>
      )}
    </>
  );
}
