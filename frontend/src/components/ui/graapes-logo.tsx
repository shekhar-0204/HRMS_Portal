import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  variant?: "white" | "emerald" | "slate";
}

/**
 * Graapes Iconic Connected-Nodes Logo
 * Perfectly vector-drawn 1:1 replica of the official Graapes geometric mark:
 * A circle of satellites with a central keyhole node bridging outwards.
 */
export function GraapesLogo({ className, size = 36, variant = "emerald" }: LogoProps) {
  const colorMap = {
    white: "fill-white",
    emerald: "fill-emerald-600",
    slate: "fill-slate-900",
  };

  const fillColor = colorMap[variant] || colorMap.emerald;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0 transition-transform duration-200", className)}
    >
      <g className={fillColor}>
        {/* Ring of 7 circular outer nodes (orbiting counter-clockwise from top) */}
        {/* Top 1 */}
        <circle cx="120" cy="40" r="22" />
        {/* Top-Right 2 */}
        <circle cx="170" cy="62" r="22" />
        {/* Top-Left 3 */}
        <circle cx="70" cy="62" r="22" />
        {/* Far-Left 4 */}
        <circle cx="48" cy="120" r="22" />
        {/* Bottom-Left 5 */}
        <circle cx="50" cy="178" r="22" />
        {/* Bottom-Center-Left 6 */}
        <circle cx="85" cy="216" r="22" />
        {/* Bottom-Center-Right 7 */}
        <circle cx="120" cy="216" r="22" />
        {/* Bottom-Right 8 */}
        <circle cx="165" cy="188" r="22" />

        {/* Center keyhole node bridged directly to middle-right node */}
        {/* Bridge path connecting center node to right satellite node */}
        <path
          d="M 120 95
             C 142 95, 155 106, 175 106
             A 24 24 0 0 1 175 154
             C 155 154, 142 145, 120 145
             A 25 25 0 0 1 120 95 Z"
        />

        {/* Center circle */}
        <circle cx="120" cy="120" r="25" />
        {/* Middle right circle connected to bridge */}
        <circle cx="180" cy="130" r="23" />
      </g>

      {/* Center cutout hole in the keyhole node */}
      <circle cx="120" cy="120" r="8" fill="#0f172a" className="dark:fill-slate-900" />
    </svg>
  );
}
