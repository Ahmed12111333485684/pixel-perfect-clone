import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { MediaPreview } from "@/components/MediaPreview";

export function MediaLightbox({
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

  return createPortal(
    <div
      id="media-lightbox"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 pointer-events-auto"
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
        <MediaPreview
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
    </div>,
    document.body,
  );
}
