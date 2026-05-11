"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { AnimatePresence } from "framer-motion";
import { MapPinTooltip } from "./map-pin-tooltip";

export type MapPin = {
  id: number;
  lat: number;
  lng: number;
  title: string;
  type: "item" | "service";
  description: string;
  imageUrl: string | null;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

type NozarMapProps = {
  apiKey: string;
  pins: MapPin[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onPinClick?: (id: number) => void;
  /** Center point for radar rings — defaults to `center` prop */
  radarCenter?: { lat: number; lng: number };
  /** Active radar radius in km; when set, draws concentric rings */
  radarRadiusKm?: number;
  /** Called when user selects a new radius from the floating control */
  onRadiusChange?: (km: number) => void;
};

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0a0f1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f1a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a5568" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1a2332" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a5568" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#030712" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
];

const JHB_CENTER = { lat: -26.2041, lng: 28.0473 };

// Radius options shown in the floating selector (km)
const RADIUS_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Build the "You are here" SVG as a data URL for use as a Marker icon.
 * Outer emerald ring → cyan fill → white centre dot.
 */
function youAreHereSvgUrl(): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">',
    '<circle cx="16" cy="16" r="14" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.75)" stroke-width="1.5"/>',
    '<circle cx="16" cy="16" r="7" fill="rgba(6,182,212,0.9)" stroke="white" stroke-width="2"/>',
    '<circle cx="16" cy="16" r="3" fill="white"/>',
    "</svg>",
  ].join("");
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function NozarMap({
  apiKey,
  pins,
  center = JHB_CENTER,
  zoom = 12,
  onPinClick,
  radarCenter,
  radarRadiusKm,
  onRadiusChange,
}: NozarMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPin, setHoveredPin] = useState<MapPin | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Helper to calculate pixel coordinates from LatLng for the tooltip.
   */
  const getPixelPosition = useCallback(
    (pin: MapPin) => {
      if (!mapInstance) return null;
      const projection = mapInstance.getProjection();
      const bounds = mapInstance.getBounds();
      if (!projection || !bounds) return null;

      const latLng = new google.maps.LatLng(pin.lat, pin.lng);
      const topRight = projection.fromLatLngToPoint(bounds.getNorthEast())!;
      const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest())!;
      const scale = Math.pow(2, mapInstance.getZoom()!);
      const worldPoint = projection.fromLatLngToPoint(latLng)!;

      return {
        x: (worldPoint.x - bottomLeft.x) * scale,
        y: (worldPoint.y - topRight.y) * scale,
      };
    },
    [mapInstance],
  );

  useEffect(() => {
    if (mapInstance && center) {
      mapInstance.setCenter(center);
    }
  }, [mapInstance, center]);

  useEffect(() => {
    if (!mapRef.current) return;

    setOptions({
      key: apiKey,
      v: "weekly",
    });

    // Load both libraries upfront so "marker" is cached before the pin effects run.
    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(([{ Map }]) => {
        const map = new Map(mapRef.current!, {
          center,
          zoom,
          styles: DARK_MAP_STYLE,
          // mapId is required for AdvancedMarkerElement; DEMO_MAP_ID is
          // Google's public test ID that enables Advanced Markers without
          // Cloud Console setup.
          mapId: "DEMO_MAP_ID",
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        setMapInstance(map);
      })
      .catch((err: unknown) => {
        setError("Failed to load map");
        if (process.env.NODE_ENV !== "production") {
          const details = err instanceof Error ? err.message : String(err);
          setError(`Failed to load map: ${details}`);
        }
      });
  }, [apiKey]);

  useEffect(() => {
    if (!mapInstance) return;

    // "marker" library is already cached from the init effect — this resolves
    // synchronously after the first load.
    let cancelled = false;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    void importLibrary("marker").then(({ AdvancedMarkerElement, PinElement }) => {
      if (cancelled) return;

      pins.forEach((pin) => {
        // PinElement reproduces the emerald/cyan colour scheme used previously
        // with SymbolPath.CIRCLE icons.
        const pin_elem = new PinElement({
          background: pin.type === "service" ? "#06B6D4" : "#10B981",
          borderColor: "#030712",
          glyphColor: "#030712",
        });

        const marker = new AdvancedMarkerElement({
          position: { lat: pin.lat, lng: pin.lng },
          map: mapInstance,
          title: pin.title,
          content: pin_elem.element,
        });

        if (onPinClick) {
          // AdvancedMarkerElement fires "gmp-click", not "click".
          marker.addListener("gmp-click", () => onPinClick(pin.id));
        }

        // Add mouseenter/mouseleave listeners to the marker's DOM element
        marker.element.addEventListener("mouseenter", () => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = setTimeout(() => {
            const pos = getPixelPosition(pin);
            if (pos) {
              setTooltipPosition(pos);
              setHoveredPin(pin);
            }
          }, 100); // 100ms enter delay
        });

        marker.element.addEventListener("mouseleave", () => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = setTimeout(() => {
            setHoveredPin(null);
          }, 600); // 600ms exit delay (increased slightly)
        });

        markers.push(marker);
      });
    });

    return () => {
      cancelled = true;
      markers.forEach((marker) => {
        marker.map = null;
      });
    };
  }, [mapInstance, pins, onPinClick]);

  /**
   * Sync tooltip position with map coordinates.
   */
  useEffect(() => {
    if (!hoveredPin || !mapInstance) {
      setTooltipPosition(null);
      return;
    }

    const updatePosition = () => {
      const pos = getPixelPosition(hoveredPin);
      if (pos) {
        setTooltipPosition(pos);
      }
    };

    updatePosition();

    // Re-calculate on zoom or pan
    const l1 = mapInstance.addListener("bounds_changed", updatePosition);
    const l2 = mapInstance.addListener("zoom_changed", updatePosition);

    return () => {
      google.maps.event.removeListener(l1);
      google.maps.event.removeListener(l2);
    };
  }, [hoveredPin, mapInstance]);

  /**
   * "You are here" beacon at radarCenter (or center).
   * Cleanup closure removes the marker before the next effect run.
   */
  useEffect(() => {
    if (!mapInstance) return;

    const effectCenter = radarCenter ?? center;
    let cancelled = false;
    let beacon: google.maps.marker.AdvancedMarkerElement | null = null;

    void importLibrary("marker").then(({ AdvancedMarkerElement }) => {
      if (cancelled) return;

      // Use an <img> element carrying the SVG data URL as the marker content,
      // preserving the outer emerald ring → cyan fill → white centre-dot design.
      const img = document.createElement("img");
      img.src = youAreHereSvgUrl();
      img.width = 32;
      img.height = 32;
      img.style.display = "block";

      beacon = new AdvancedMarkerElement({
        position: effectCenter,
        map: mapInstance,
        title: "You are here",
        content: img,
        zIndex: 1000,
        // No click listener — beacon is display-only.
      });
    });

    return () => {
      cancelled = true;
      if (beacon) beacon.map = null;
    };
  }, [mapInstance, radarCenter, center]);

  /**
   * Radar concentric rings.
   * Three overlapping circles (outer → middle → inner) with decreasing opacity
   * simulate visual depth without CSS animation (Google Maps circles are DOM-agnostic).
   * The closure captures `circles` so the cleanup removes exactly the rings it created.
   */
  useEffect(() => {
    if (!mapInstance || radarRadiusKm === undefined) return;

    const effectCenter = radarCenter ?? center;
    const radiusM = radarRadiusKm * 1000;

    const circles = [
      // Outer ring — 8% fill, faint stroke
      new google.maps.Circle({
        map: mapInstance,
        center: effectCenter,
        radius: radiusM,
        fillColor: "#10B981",
        fillOpacity: 0.08,
        strokeColor: "#10B981",
        strokeOpacity: 0.5,
        strokeWeight: 1,
        clickable: false,
      }),
      // Middle ring — 15% fill, cyan tint, slightly stronger stroke
      new google.maps.Circle({
        map: mapInstance,
        center: effectCenter,
        radius: radiusM * 0.66,
        fillColor: "#06B6D4",
        fillOpacity: 0.15,
        strokeColor: "#10B981",
        strokeOpacity: 0.65,
        strokeWeight: 1,
        clickable: false,
      }),
      // Inner ring — 25% fill, solid stroke
      new google.maps.Circle({
        map: mapInstance,
        center: effectCenter,
        radius: radiusM * 0.33,
        fillColor: "#10B981",
        fillOpacity: 0.25,
        strokeColor: "#10B981",
        strokeOpacity: 0.85,
        strokeWeight: 1.5,
        clickable: false,
      }),
    ];

    // Cleanup: remove circles before next radius/center change
    return () => {
      circles.forEach((c) => c.setMap(null));
    };
  }, [mapInstance, radarCenter, radarRadiusKm, center]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#030712] px-6">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 px-5 py-4 text-center ring-1 ring-rose-500/20">
          <p className="text-sm font-semibold text-rose-200">Map failed to load</p>
          <p className="mt-1 text-xs text-rose-200/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      {!mapInstance && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#030712]/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0F172A]/90 px-4 py-2 text-sm text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Loading map…
          </div>
        </div>
      )}

      {/* Radar radius selector — bottom-left */}
      {onRadiusChange !== undefined && radarRadiusKm !== undefined && (
        <div className="absolute bottom-6 left-6 z-10 rounded-xl border border-white/10 bg-[#0F172A]/90 p-2 shadow-lg backdrop-blur">
          <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Local radius
          </p>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => onRadiusChange(km)}
                className={
                  radarRadiusKm === km
                    ? "rounded-lg bg-emerald-500 px-2.5 py-1.5 font-mono text-xs font-semibold text-[#030712] transition-colors"
                    : "rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10"
                }
              >
                {km}km
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tooltip Overlay */}
      <AnimatePresence>
        {tooltipPosition && hoveredPin && (
          <MapPinTooltip
            key={hoveredPin.id}
            pin={hoveredPin}
            x={tooltipPosition.x}
            y={tooltipPosition.y}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = setTimeout(() => {
                setHoveredPin(null);
              }, 600); // 600ms exit delay
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
