"use client";

import { Sector } from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";

/**
 * Secteur Pie Recharts 3 — halo « lift » quand isActive (via prop shape).
 */
export function PremiumPieActiveShape(raw: PieSectorShapeProps) {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill = "#6366f1",
    isActive = false,
    cornerRadius,
  } = raw;

  if (!isActive) {
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={cornerRadius}
      />
    );
  }

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        fillOpacity={0.22}
        stroke="transparent"
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={3}
        cornerRadius={cornerRadius}
        style={{ filter: "drop-shadow(0 8px 16px rgba(15, 23, 42, 0.18))" }}
      />
    </g>
  );
}
