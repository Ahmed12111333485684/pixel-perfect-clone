const VIDEO_EXTENSIONS = [".mp4", ".m4v", ".mov", ".ogg", ".ogv", ".webm"];

export function isVideoAsset(source: {
  mimeType?: string | null;
  fileName?: string | null;
  url?: string | null;
}): boolean {
  if (source.mimeType?.toLowerCase().startsWith("video/")) return true;

  const candidate = (source.fileName ?? source.url ?? "").toLowerCase().split(/[?#]/, 1)[0];
  return VIDEO_EXTENSIONS.some((extension) => candidate.endsWith(extension));
}
