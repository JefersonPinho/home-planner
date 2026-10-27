import { deriveRooms, type DerivedRoom } from "@/features/rooms/derive-rooms";
import { closestPointOnSegment, pointInPolygon, polygonArea, polygonCentroid } from "@/lib/geometry/polygon";
import { distance } from "@/lib/geometry/vec";
import type { Room, Vec2, Wall } from "@/types/scene";

export type RoomSpan = {
  width: number;
  depth: number;
};

export type PresentedRoom = DerivedRoom & {
  usefulArea: number;
  externalArea: number;
  inner: Vec2[];
  outer: Vec2[];
  internal: RoomSpan | null;
  external: RoomSpan | null;
  savedId: string | null;
};

export function presentRooms(walls: Wall[], saved: Room[] = []): PresentedRoom[] {
  const derived = deriveRooms(walls);
  const inners = derived.map((room) => offsetRoom(room.polygon, walls, "inner"));
  const outers = derived.map((room, index) => offsetRoom(room.polygon, walls, "outer", derived.filter((_, other) => other !== index).map((entry) => entry.polygon)));
  const claimed = new Set<string>();
  return derived.map((room, index) => {
    const inner = inners[index] ?? room.polygon;
    const outer = outers[index] ?? room.polygon;
    const usefulArea = Math.abs(polygonArea(inner));
    const externalArea = Math.abs(polygonArea(outer));
    const match = matchSaved(room, saved, claimed);
    if (match) claimed.add(match.id);
    return {
      ...room,
      name: match?.name || `Cômodo ${index + 1}`,
      usefulArea: usefulArea > 0.05 ? usefulArea : room.area,
      externalArea: externalArea > 0.05 ? externalArea : room.area,
      inner,
      outer,
      internal: rectangularSpan(inner),
      external: rectangularSpan(outer),
      savedId: match?.id ?? null,
    };
  });
}

export function roomAtPoint(walls: Wall[], point: Vec2, saved: Room[] = []): PresentedRoom | null {
  const rooms = presentRooms(walls, saved);
  return rooms.find((room) => pointInPolygon(point, room.polygon)) ?? null;
}

function matchSaved(room: DerivedRoom, saved: Room[], claimed: Set<string>): Room | null {
  let best: Room | null = null;
  let bestDistance = 1.2;
  for (const entry of saved) {
    if (claimed.has(entry.id) || entry.polygon.length < 3) continue;
    const savedCentroid = polygonCentroid(entry.polygon);
    const gap = distance(savedCentroid, room.centroid);
    const inside = pointInPolygon(savedCentroid, room.polygon) || pointInPolygon(room.centroid, entry.polygon);
    if ((inside || gap < 0.45) && gap < bestDistance) {
      best = entry;
      bestDistance = gap;
    }
  }
  return best;
}

function offsetRoom(polygon: Vec2[], walls: Wall[], mode: "inner" | "outer", others: Vec2[][] = []): Vec2[] | null {
  if (polygon.length < 3) return null;
  const distances = polygon.map((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    if (!next) return 0;
    const half = thicknessOfEdge(point, next, walls) / 2;
    if (mode === "inner") return half;
    return edgeIsShared(point, next, others) ? 0 : -half;
  });
  const offset = offsetPolygon(polygon, distances);
  if (!offset || Math.abs(polygonArea(offset)) < 0.05) return null;
  if (Math.sign(polygonArea(offset)) !== Math.sign(polygonArea(polygon))) return null;
  return offset;
}

function offsetPolygon(polygon: Vec2[], distances: number[]): Vec2[] | null {
  const area = polygonArea(polygon);
  const inwardSign = area >= 0 ? 1 : -1;
  const lines = polygon.map((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    if (!point || !next) return null;
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    const length = Math.hypot(dx, dy) || 1;
    const direction = { x: dx / length, y: dy / length };
    const inward = { x: -direction.y * inwardSign, y: direction.x * inwardSign };
    const shift = distances[index] ?? 0;
    return {
      origin: { x: point.x + inward.x * shift, y: point.y + inward.y * shift },
      direction,
    };
  });
  const points: Vec2[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const previous = lines[(index + polygon.length - 1) % polygon.length];
    const current = lines[index];
    if (!previous || !current) return null;
    const hit = lineIntersection(previous.origin, previous.direction, current.origin, current.direction);
    if (!hit) return null;
    points.push(hit);
  }
  return points;
}

function thicknessOfEdge(a: Vec2, b: Vec2, walls: Wall[]): number {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let best = 0.15;
  let bestGap = 0.08;
  for (const wall of walls) {
    const closest = closestPointOnSegment(mid, wall.a, wall.b);
    if (closest.distance < bestGap && closest.t > 0.01 && closest.t < 0.99) {
      bestGap = closest.distance;
      best = wall.thickness;
    }
  }
  return best;
}

function edgeIsShared(a: Vec2, b: Vec2, others: Vec2[][]): boolean {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  for (const polygon of others) {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (!start || !end) continue;
      const closest = closestPointOnSegment(mid, start, end);
      if (closest.distance <= 0.04 && closest.t > 0.02 && closest.t < 0.98) return true;
    }
  }
  return false;
}

function rectangularSpan(polygon: Vec2[]): RoomSpan | null {
  if (polygon.length !== 4) return null;
  const edges = polygon.map((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    if (!next) return null;
    return { x: next.x - point.x, y: next.y - point.y };
  });
  const first = edges[0];
  const second = edges[1];
  if (!first || !second) return null;
  const firstLength = Math.hypot(first.x, first.y);
  const secondLength = Math.hypot(second.x, second.y);
  if (firstLength < 0.05 || secondLength < 0.05) return null;
  const dot = Math.abs(first.x * second.x + first.y * second.y) / (firstLength * secondLength);
  if (dot > 0.08) return null;
  return { width: firstLength, depth: secondLength };
}

function lineIntersection(origin: Vec2, direction: Vec2, otherOrigin: Vec2, otherDirection: Vec2): Vec2 | null {
  const denominator = direction.x * otherDirection.y - direction.y * otherDirection.x;
  if (Math.abs(denominator) < 1e-8) return null;
  const dx = otherOrigin.x - origin.x;
  const dy = otherOrigin.y - origin.y;
  const t = (dx * otherDirection.y - dy * otherDirection.x) / denominator;
  return { x: origin.x + direction.x * t, y: origin.y + direction.y * t };
}
