const VIDEO_EXTENSIONS = [".mp4", ".m4v", ".mov", ".ogg", ".ogv", ".webm"];
const DOCUMENT_EXTENSIONS = [".pdf", ".docx"];

export type MediaSource = {
  mimeType?: string | null;
  fileName?: string | null;
  url?: string | null;
};

function extensionOf(value?: string | null): string {
  return (value ?? "").toLowerCase().split(/[?#]/, 1)[0];
}

function endsWithAny(candidate: string, extensions: string[]): boolean {
  return extensions.some((extension) => candidate.endsWith(extension));
}

export function isVideoAsset(source: MediaSource): boolean {
  if (source.mimeType?.toLowerCase().startsWith("video/")) return true;
  if (endsWithAny(extensionOf(source.fileName), VIDEO_EXTENSIONS)) return true;
  return endsWithAny(extensionOf(source.url), VIDEO_EXTENSIONS);
}

export function isDocumentAsset(source: MediaSource): boolean {
  const mime = source.mimeType?.toLowerCase() ?? "";
  if (mime === "application/pdf" || mime.includes("officedocument")) return true;
  if (endsWithAny(extensionOf(source.fileName), DOCUMENT_EXTENSIONS)) return true;
  return endsWithAny(extensionOf(source.url), DOCUMENT_EXTENSIONS);
}

export type MediaKind = "image" | "video" | "document";

export function mediaKind(source: MediaSource): MediaKind {
  if (isVideoAsset(source)) return "video";
  if (isDocumentAsset(source)) return "document";
  return "image";
}

export function isAcceptedMediaFile(file: File): boolean {
  const mime = (file.type ?? "").toLowerCase();
  if (mime.startsWith("image/") || mime.startsWith("video/")) return true;
  if (mime === "application/pdf" || mime.includes("officedocument")) return true;

  const ext = `.${(file.name.split(".").pop() ?? "").toLowerCase()}`;
  return [...VIDEO_EXTENSIONS, ...DOCUMENT_EXTENSIONS].includes(ext);
}
