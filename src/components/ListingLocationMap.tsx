import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

export type ListingCoordinates = {
  lat: number;
  lng: number;
};

function isValid(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/**
 * Parses coordinates from a raw value: a "lat, lng" string or a full Google
 * Maps URL. Short share links contain no coordinates and cannot be parsed in
 * the browser; they are resolved server-side and arrive via resolvedCoordinates.
 */
export function parseListingCoordinates(value?: string | null): ListingCoordinates | null {
  if (!value) return null;
  const text = value.trim();

  const bare = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (bare) {
    const lat = Number(bare[1]);
    const lng = Number(bare[2]);
    if (isValid(lat, lng)) return { lat, lng };
  }

  // Must be a URL from here on.
  if (!/^https?:\/\//i.test(text)) return null;

  // Prefer the place pin (!3d!4d) over the viewport (@lat,lng).
  const markers: Record<number, number> = {};
  const markerRegex = /!(\d+)d(-?\d+(?:\.\d+)?)/g;
  let marker: RegExpExecArray | null;
  while ((marker = markerRegex.exec(text)) !== null) {
    const index = Number(marker[1]);
    if (markers[index] === undefined) markers[index] = Number(marker[2]);
  }
  if (markers[3] !== undefined && markers[4] !== undefined && isValid(markers[3], markers[4])) {
    return { lat: markers[3], lng: markers[4] };
  }

  const query = text.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (query) {
    const lat = Number(query[1]);
    const lng = Number(query[2]);
    if (isValid(lat, lng)) return { lat, lng };
  }

  const at = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const lat = Number(at[1]);
    const lng = Number(at[2]);
    if (isValid(lat, lng)) return { lat, lng };
  }

  return null;
}

export function formatListingCoordinates(coords: ListingCoordinates) {
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
}

function buildEmbedUrl(coords: ListingCoordinates) {
  return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`;
}

type ListingLocationMapProps = {
  /** Raw value from the field: a Google Maps link or "lat, lng". */
  coordinates?: string | null;
  /** Server-resolved canonical coordinates (preferred for rendering). */
  resolvedCoordinates?: string | null;
  className?: string;
  heightClassName?: string;
  emptyMessage?: string;
  helperText?: string;
};

export function ListingLocationMap({
  coordinates,
  resolvedCoordinates,
  className,
  heightClassName = "h-72",
  emptyMessage,
  helperText,
}: ListingLocationMapProps) {
  const { t } = useTranslation();

  const parsed = useMemo(
    () => parseListingCoordinates(resolvedCoordinates) ?? parseListingCoordinates(coordinates),
    [resolvedCoordinates, coordinates],
  );
  const embedUrl = parsed ? buildEmbedUrl(parsed) : null;
  const label = parsed ? formatListingCoordinates(parsed) : "";
  const sourceIsUrl = !!coordinates && /^https?:\/\//i.test(coordinates.trim());

  return (
    <div className={className}>
      {embedUrl ? (
        <iframe
          title={t("map.title", { defaultValue: "Property location map" })}
          src={embedUrl}
          className={`w-full overflow-hidden rounded-xl border border-border bg-muted ${heightClassName}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div
          className={`flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-muted px-4 text-center ${heightClassName}`}
        >
          <p className="text-sm text-muted-foreground">
            {emptyMessage ?? t("map.empty", { defaultValue: "No location selected yet." })}
          </p>
          {sourceIsUrl && (
            <a
              href={coordinates!.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("map.openLink", { defaultValue: "Open in Google Maps" })}
            </a>
          )}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {helperText ??
            t("map.helperText", {
              defaultValue: "Paste a Google Maps link or coordinates.",
            })}
        </span>
        {label && <span className="font-mono" dir="ltr">{label}</span>}
      </div>
    </div>
  );
}
