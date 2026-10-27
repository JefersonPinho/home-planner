import { closestPointOnSegment, pointAlongWall, pointInFurniture, wallNormal } from "@/lib/geometry/polygon";
import { distance } from "@/lib/geometry/vec";
import { wallLength } from "@/features/walls/intervals";
import type { Selection } from "@/types/editor";
import type { FurnitureInstance, SceneDocument, Vec2 } from "@/types/scene";

export type PlanHit =
  | { type: "rotate"; id: string }
  | { type: "endpoint"; id: string; end: "a" | "b" }
  | { type: "furniture"; id: string }
  | { type: "opening"; id: string }
  | { type: "measurement"; id: string }
  | { type: "wall"; id: string };

function rotateHandle(item: FurnitureInstance): Vec2 {
  return {
    x: item.x + -Math.sin(item.rotation) * (item.depth / 2 + 0.42),
    y: item.y + Math.cos(item.rotation) * (item.depth / 2 + 0.42),
  };
}

export function hitTest(document: SceneDocument, point: Vec2, zoom: number, selection: Selection): PlanHit | null {
  const pixel = (size: number) => size / Math.max(zoom, 1);

  if (selection?.type === "furniture") {
    const item = document.furniture.find((entry) => entry.id === selection.id);
    if (item && distance(point, rotateHandle(item)) <= pixel(14)) {
      return { type: "rotate", id: item.id };
    }
  }

  let bestEnd: { hit: PlanHit; distance: number } | null = null;
  for (const wall of document.walls) {
    for (const end of ["a", "b"] as const) {
      const gap = distance(point, wall[end]);
      if (gap <= pixel(12) && (!bestEnd || gap < bestEnd.distance)) {
        bestEnd = { hit: { type: "endpoint", id: wall.id, end }, distance: gap };
      }
    }
  }
  if (bestEnd) return bestEnd.hit;

  for (let index = document.furniture.length - 1; index >= 0; index -= 1) {
    const item = document.furniture[index];
    if (item && pointInFurniture(point, item, pixel(4))) return { type: "furniture", id: item.id };
  }

  let bestOpening: { id: string; distance: number } | null = null;
  for (const opening of document.openings) {
    const wall = document.walls.find((entry) => entry.id === opening.wallId);
    if (!wall) continue;
    const half = opening.width / 2;
    const start = pointAlongWall(wall, opening.offset - half);
    const end = pointAlongWall(wall, opening.offset + half);
    const closest = closestPointOnSegment(point, start, end);
    const limit = Math.max(wall.thickness, pixel(10));
    if (closest.distance <= limit && (!bestOpening || closest.distance < bestOpening.distance)) {
      bestOpening = { id: opening.id, distance: closest.distance };
    }
  }
  if (bestOpening) return { type: "opening", id: bestOpening.id };

  let bestMeasure: { id: string; distance: number } | null = null;
  for (const measurement of document.measurements) {
    const closest = closestPointOnSegment(point, measurement.a, measurement.b);
    if (closest.t <= 0 || closest.t >= 1) continue;
    if (closest.distance <= pixel(8) && (!bestMeasure || closest.distance < bestMeasure.distance)) {
      bestMeasure = { id: measurement.id, distance: closest.distance };
    }
  }
  if (bestMeasure) return { type: "measurement", id: bestMeasure.id };

  let bestWall: { id: string; distance: number } | null = null;
  for (const wall of document.walls) {
    if (wallLength(wall) < 0.02) continue;
    const closest = closestPointOnSegment(point, wall.a, wall.b);
    const limit = Math.max(wall.thickness / 2 + pixel(4), pixel(8));
    if (closest.distance <= limit && (!bestWall || closest.distance < bestWall.distance)) {
      bestWall = { id: wall.id, distance: closest.distance };
    }
  }
  if (bestWall) return { type: "wall", id: bestWall.id };
  return null;
}

export function handlePoint(item: FurnitureInstance): Vec2 {
  return rotateHandle(item);
}

export function wallLabelOffset(wall: { a: Vec2; b: Vec2; thickness: number; id: string; height: number }): Vec2 {
  const normal = wallNormal(wall);
  return {
    x: (wall.a.x + wall.b.x) / 2 + normal.x * (wall.thickness / 2 + 0.28),
    y: (wall.a.y + wall.b.y) / 2 + normal.y * (wall.thickness / 2 + 0.28),
  };
}
