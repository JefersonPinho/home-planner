import { roundMm } from "@/lib/format";
import { closestPointOnSegment, segmentIntersection } from "@/lib/geometry/polygon";
import { distance, normalizeAngle } from "@/lib/geometry/vec";
import type { SnapHit, SnapKind } from "@/types/editor";
import type { Vec2, Wall } from "@/types/scene";

const ANGLE_STEP = Math.PI / 4;
const ANGLE_LIMIT = (8 * Math.PI) / 180;

function gridPoint(point: Vec2, grid: number): Vec2 {
  return {
    x: roundMm(Math.round(point.x / grid) * grid),
    y: roundMm(Math.round(point.y / grid) * grid),
  };
}

function nearest(point: Vec2, candidates: { point: Vec2; kind: SnapKind }[], threshold: number): SnapHit | null {
  let best: SnapHit | null = null;
  let bestDistance = threshold;
  for (const candidate of candidates) {
    const gap = distance(point, candidate.point);
    if (gap <= bestDistance) {
      bestDistance = gap;
      best = candidate;
    }
  }
  return best;
}

function angleSnap(raw: Vec2, anchor: Vec2, grid: number): Vec2 | null {
  const dx = raw.x - anchor.x;
  const dy = raw.y - anchor.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.02) return null;
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / ANGLE_STEP) * ANGLE_STEP;
  if (Math.abs(normalizeAngle(angle - snapped)) > ANGLE_LIMIT) return null;
  const snappedLength = Math.max(grid, Math.round(length / grid) * grid);
  return {
    x: roundMm(anchor.x + Math.cos(snapped) * snappedLength),
    y: roundMm(anchor.y + Math.sin(snapped) * snappedLength),
  };
}

export function snapPoint(
  raw: Vec2,
  walls: Wall[],
  options: {
    gridSize: number;
    snapEnabled: boolean;
    zoom: number;
    excludeWallId?: string;
    anchor?: Vec2;
  },
): SnapHit {
  const rounded = { x: roundMm(raw.x), y: roundMm(raw.y) };
  if (!options.snapEnabled) return { point: rounded, kind: "grid" };

  const threshold = 14 / Math.max(options.zoom, 1);
  const relevant = walls.filter((wall) => wall.id !== options.excludeWallId);
  const endpoints: { point: Vec2; kind: SnapKind }[] = [];
  for (const wall of relevant) {
    endpoints.push({ point: wall.a, kind: "endpoint" }, { point: wall.b, kind: "endpoint" });
  }
  const endpoint = nearest(raw, endpoints, threshold);
  if (endpoint) return { point: { x: roundMm(endpoint.point.x), y: roundMm(endpoint.point.y) }, kind: "endpoint" };

  const intersections: { point: Vec2; kind: SnapKind }[] = [];
  for (let i = 0; i < relevant.length; i += 1) {
    for (let j = i + 1; j < relevant.length; j += 1) {
      const first = relevant[i];
      const second = relevant[j];
      if (!first || !second) continue;
      const hit = segmentIntersection(first.a, first.b, second.a, second.b);
      if (hit) intersections.push({ point: hit, kind: "intersection" });
    }
  }
  const intersection = nearest(raw, intersections, threshold);
  if (intersection) {
    return { point: { x: roundMm(intersection.point.x), y: roundMm(intersection.point.y) }, kind: "intersection" };
  }

  let wallHit: SnapHit | null = null;
  let wallDistance = threshold;
  for (const wall of relevant) {
    const closest = closestPointOnSegment(raw, wall.a, wall.b);
    if (closest.t < 0.02 || closest.t > 0.98) continue;
    if (closest.distance <= wallDistance) {
      wallDistance = closest.distance;
      wallHit = { point: { x: roundMm(closest.point.x), y: roundMm(closest.point.y) }, kind: "wall" };
    }
  }
  if (wallHit) return wallHit;

  if (options.anchor) {
    const angled = angleSnap(raw, options.anchor, options.gridSize);
    if (angled) return { point: angled, kind: "angle" };
  }

  return { point: gridPoint(raw, options.gridSize), kind: "grid" };
}
