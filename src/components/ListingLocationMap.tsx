import { useEffect, useMemo, useRef } from "react";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

export type ListingCoordinates = {
  lat: number;
  lng: number;
};

const DEFAULT_CENTER: ListingCoordinates = {
  lat: 24.7136,
  lng: 46.6753,
};

export function parseListingCoordinates(value?: string | null): ListingCoordinates | null {
  if (!value) return null;
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;

  const lat = Number(matches[0]);
  const lng = Number(matches[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat, lng };
}

export function formatListingCoordinates(coords: ListingCoordinates) {
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
}

type ListingLocationMapProps = {
  coordinates?: string | null;
  onCoordinatesChange?: (value: string) => void;
  editable?: boolean;
  className?: string;
  heightClassName?: string;
  emptyMessage?: string;
  helperText?: string;
};

export function ListingLocationMap({
  coordinates,
  onCoordinatesChange,
  editable = false,
  className,
  heightClassName = "h-72",
  emptyMessage = "No location selected yet.",
  helperText = "Click the map to choose a location.",
}: ListingLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const parsedCoordinates = useMemo(() => parseListingCoordinates(coordinates), [coordinates]);
  const coordinatesLabel = parsedCoordinates ? formatListingCoordinates(parsedCoordinates) : "";

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    let marker: import("leaflet").Marker | null = null;

    const setupMap = async () => {
      if (!mapContainerRef.current) return;
      const leaflet = await import("leaflet");
      if (cancelled || !mapContainerRef.current) return;

      delete (leaflet.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconUrl: markerIconUrl,
        iconRetinaUrl: markerIcon2xUrl,
        shadowUrl: markerShadowUrl,
      });

      const target = parsedCoordinates ?? DEFAULT_CENTER;
      map = leaflet.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: editable,
        boxZoom: editable,
        keyboard: editable,
      });

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(map);

      map.setView([target.lat, target.lng], parsedCoordinates ? 15 : 6);

      const syncMarker = (next: ListingCoordinates) => {
        if (!map) return;
        const latLng: [number, number] = [next.lat, next.lng];
        if (!marker) {
          marker = leaflet.marker(latLng, { draggable: editable }).addTo(map);
          if (editable) {
            marker.on("dragend", () => {
              const pos = marker?.getLatLng();
              if (!pos) return;
              onCoordinatesChange?.(
                formatListingCoordinates({ lat: pos.lat, lng: pos.lng }),
              );
            });
          }
        } else {
          marker.setLatLng(latLng);
        }
        map.setView(latLng, Math.max(map.getZoom(), parsedCoordinates ? 15 : 12), {
          animate: false,
        });
      };

      if (parsedCoordinates) {
        syncMarker(parsedCoordinates);
      }

      if (editable) {
        map.on("click", (event) => {
          const next = {
            lat: event.latlng.lat,
            lng: event.latlng.lng,
          };
          syncMarker(next);
          onCoordinatesChange?.(formatListingCoordinates(next));
        });
      }

      requestAnimationFrame(() => {
        map?.invalidateSize();
      });
    };

    void setupMap();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [editable, onCoordinatesChange, parsedCoordinates]);

  return (
    <div className={className}>
      <div
        ref={mapContainerRef}
        className={`overflow-hidden rounded-xl border border-border bg-muted ${heightClassName}`}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{editable ? helperText : emptyMessage}</span>
        {coordinatesLabel && <span className="font-mono">{coordinatesLabel}</span>}
      </div>
    </div>
  );
}