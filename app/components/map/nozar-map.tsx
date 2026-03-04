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
        console.error("Google Maps load error:", err);
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
      <div className="w-full h-full flex items-center justify-center bg-[#030712] text-slate-500 text-sm">
        {error}
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full" />;
}
