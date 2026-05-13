"use client";

import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router";
import type { MapPin } from "./nozar-map";

type MapPinTooltipProps = {
  pin: MapPin;
  x: number;
  y: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function MapPinTooltip({
  pin,
  x,
  y,
  onMouseEnter,
  onMouseLeave,
}: MapPinTooltipProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute z-[100] w-64 overflow-hidden rounded-xl border border-gray-800 bg-sa-black/90 shadow-2xl backdrop-blur-md"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -100%) translateY(-24px)",
      }}
    >
      {/* Accent border top */}
      <div
        className={`h-1 w-full ${
          pin.type === "service" ? "bg-sa-gold" : "bg-sa-green"
        }`}
      />

      <Link to={`/dashboard/asset/${pin.id}`} className="block overflow-hidden">
        {pin.imageUrl ? (
          <img
            src={pin.imageUrl}
            alt={pin.title}
            className="h-32 w-full object-cover transition-transform duration-500 hover:scale-110"
          />
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-gray-800 text-xs text-gray-500">
            No image available
          </div>
        )}
      </Link>

      <div className="p-3">
        <Link
          to={`/dashboard/asset/${pin.id}`}
          className="group flex items-start justify-between gap-2"
        >
          <h4
            className={`text-sm font-bold leading-tight transition-colors ${
              pin.type === "service"
                ? "text-sa-gold group-hover:text-sa-gold/80"
                : "text-sa-green group-hover:text-sa-green/80"
            }`}
          >
            {pin.title}
          </h4>
          <span className="shrink-0 rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 uppercase">
            {pin.type}
          </span>
        </Link>

        <p className="mt-1.5 line-clamp-2 text-xs text-gray-400">
          {pin.description}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-3">
          <div className="flex items-center gap-2">
            {pin.user.avatarUrl ? (
              <img
                src={pin.user.avatarUrl}
                alt={pin.user.name}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-gray-700"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-[10px] font-bold text-gray-500 ring-1 ring-gray-700">
                {pin.user.name.charAt(0)}
              </div>
            )}
            <span className="text-[11px] font-semibold text-gray-300 truncate max-w-[100px]">
              {pin.user.name}
            </span>
          </div>

          <Link
            to={`/dashboard/asset/${pin.id}`}
            className="text-[10px] font-bold text-sa-green hover:underline"
          >
            VIEW DETAILS
          </Link>
        </div>
      </div>

      {/* Ndebele pattern strip at bottom (optional but adds SA identity) */}
      <div className="h-0.5 w-full bg-gradient-to-r from-sa-green via-sa-gold to-sa-red opacity-30" />
    </motion.div>
  );
}
