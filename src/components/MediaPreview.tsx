import { isVideoAsset } from "@/lib/media";

type MediaPreviewProps = {
  src: string;
  alt: string;
  fileName?: string | null;
  mimeType?: string | null;
  className?: string;
  loading?: "eager" | "lazy";
  controls?: boolean;
};

export function MediaPreview({
  src,
  alt,
  fileName,
  mimeType,
  className,
  loading,
  controls = false,
}: MediaPreviewProps) {
  if (isVideoAsset({ fileName, mimeType, url: src })) {
    return (
      <video
        src={src}
        title={alt}
        className={className}
        controls={controls}
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={src} alt={alt} className={className} loading={loading} />;
}
