import { clamp } from "@/lib/format";
import type { Bounds } from "@/lib/geometry/bounds";
import type { Camera2D } from "@/types/editor";

let viewport = { width: 800, height: 600 };

export function setPlanViewport(width: number, height: number): void {
  viewport = { width: Math.max(width, 1), height: Math.max(height, 1) };
}

export function getPlanViewport(): { width: number; height: number } {
  return viewport;
}

export function frameBounds(bounds: Bounds, width: number, height: number): Camera2D {
  const worldWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const worldHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const zoom = clamp(Math.min((width * 0.86) / worldWidth, (height * 0.86) / worldHeight), 12, 280);
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    zoom,
  };
}
