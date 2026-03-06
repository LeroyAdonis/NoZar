"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

type MapPin = {
  id: number;
  lat: number;
  lng: number;
  title: string;
  type: "item" | "service";
};

type NozarMapProps = {
  apiKey: string;
  pins: MapPin[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onPinClick?: (id: number) => void;
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

export function NozarMap({
  apiKey,
  pins,
  center = JHB_CENTER,
  zoom = 12,
  onPinClick,
}: NozarMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    setOptions({
      key: apiKey,
      v: "weekly",
    });

    importLibrary("maps")
      .then(({ Map }) => {
        const map = new Map(mapRef.current!, {
          center,
          zoom,
          styles: DARK_MAP_STYLE,
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

    const markers: google.maps.Marker[] = [];

    pins.forEach((pin) => {
      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map: mapInstance,
        title: pin.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: pin.type === "service" ? "#06B6D4" : "#10B981",
          fillOpacity: 0.9,
          strokeColor: "#030712",
          strokeWeight: 2,
        },
      });

      if (onPinClick) {
        marker.addListener("click", () => onPinClick(pin.id));
      }

      markers.push(marker);
    });

    return () => {
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [mapInstance, pins, onPinClick]);

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
    </div>
  );
}
