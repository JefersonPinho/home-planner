import { presentRooms } from "@/features/rooms/present";
import { furnitureCorners } from "@/lib/geometry/polygon";
import type { Selection } from "@/types/editor";
import type { SceneDocument, Vec2 } from "@/types/scene";

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  maxHeight: number;
};

function emptyBounds(): Bounds {
  return { minX: -2, minY: -2, maxX: 2, maxY: 2, maxHeight: 2.8 };
}

function include(bounds: Bounds, point: Vec2, height = 0): void {
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.minY = Math.min(bounds.minY, point.y);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.maxY = Math.max(bounds.maxY, point.y);
  bounds.maxHeight = Math.max(bounds.maxHeight, height);
}

function fresh(): Bounds {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, maxHeight: 0 };
}

function finalize(bounds: Bounds, pad: number): Bounds {
  if (!Number.isFinite(bounds.minX)) return emptyBounds();
  return {
    minX: bounds.minX - pad,
    minY: bounds.minY - pad,
    maxX: bounds.maxX + pad,
    maxY: bounds.maxY + pad,
    maxHeight: Math.max(bounds.maxHeight, 0.2),
  };
}

export function sceneBounds(document: SceneDocument): Bounds {
  const bounds = fresh();
  for (const wall of document.walls) {
    include(bounds, wall.a, wall.height);
    include(bounds, wall.b, wall.height);
  }
  for (const item of document.furniture) {
    for (const corner of furnitureCorners(item)) include(bounds, corner, item.height);
  }
  for (const measurement of document.measurements) {
    include(bounds, measurement.a);
    include(bounds, measurement.b);
  }
  return finalize(bounds, 0.6);
}

export function selectionBounds(document: SceneDocument, selection: Selection): Bounds | null {
  if (!selection) return null;
  const bounds = fresh();
  if (selection.type === "wall") {
    const wall = document.walls.find((item) => item.id === selection.id);
    if (!wall) return null;
    include(bounds, wall.a, wall.height);
    include(bounds, wall.b, wall.height);
  } else if (selection.type === "furniture") {
    const item = document.furniture.find((entry) => entry.id === selection.id);
    if (!item) return null;
    for (const corner of furnitureCorners(item)) include(bounds, corner, item.height);
  } else if (selection.type === "opening") {
    const opening = document.openings.find((entry) => entry.id === selection.id);
    const wall = document.walls.find((entry) => entry.id === opening?.wallId);
    if (!opening || !wall) return null;
    include(bounds, wall.a, wall.height);
    include(bounds, wall.b, wall.height);
  } else if (selection.type === "measurement") {
    const measurement = document.measurements.find((entry) => entry.id === selection.id);
    if (!measurement) return null;
    include(bounds, measurement.a);
    include(bounds, measurement.b);
  } else {
    const room = presentRooms(document.walls, document.rooms).find((entry) => entry.id === selection.id);
    if (!room) return null;
    for (const point of room.polygon) include(bounds, point);
  }
  return finalize(bounds, 0.8);
}
