import type { FurnitureInstance, Vec2, Wall } from "@/types/scene";
import { distance } from "@/lib/geometry/vec";

export function polygonArea(polygon: Vec2[]): number {
  let sum = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    if (!current || !next) continue;
    sum += current.x * next.y - next.x * current.y;
  }
  return sum / 2;
}

export function polygonCentroid(polygon: Vec2[]): Vec2 {
  let areaAccumulator = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    if (!current || !next) continue;
    const cross = current.x * next.y - next.x * current.y;
    areaAccumulator += cross;
    x += (current.x + next.x) * cross;
    y += (current.y + next.y) * cross;
  }
  const area = areaAccumulator / 2;
  if (Math.abs(area) < 1e-8 || polygon.length === 0) {
    const count = Math.max(polygon.length, 1);
    return {
      x: polygon.reduce((sum, point) => sum + point.x, 0) / count,
      y: polygon.reduce((sum, point) => sum + point.y, 0) / count,
    };
  }
  return { x: x / (6 * area), y: y / (6 * area) };
}

export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const prior = polygon[previous];
    if (!current || !prior) continue;
    const crosses =
      current.y > point.y !== prior.y > point.y &&
      point.x < ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y || 1e-12) + current.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function closestPointOnSegment(point: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number; distance: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSquared = abx * abx + aby * aby;
  if (lengthSquared < 1e-12) {
    return { point: a, t: 0, distance: distance(point, a) };
  }
  const raw = ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSquared;
  const t = Math.max(0, Math.min(1, raw));
  const projected = { x: a.x + abx * t, y: a.y + aby * t };
  return { point: projected, t, distance: distance(point, projected) };
}

export function segmentIntersection(a: Vec2, b: Vec2, c: Vec2, d: Vec2): Vec2 | null {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) < 1e-9) return null;
  const qpx = c.x - a.x;
  const qpy = c.y - a.y;
  const t = (qpx * sy - qpy * sx) / denominator;
  const u = (qpx * ry - qpy * rx) / denominator;
  if (t < 0.02 || t > 0.98 || u < 0.02 || u > 0.98) return null;
  return { x: a.x + t * rx, y: a.y + t * ry };
}

export function pointInFurniture(point: Vec2, item: FurnitureInstance, pad = 0): boolean {
  const dx = point.x - item.x;
  const dy = point.y - item.y;
  const cosine = Math.cos(item.rotation);
  const sine = Math.sin(item.rotation);
  const localX = dx * cosine + dy * sine;
  const localY = -dx * sine + dy * cosine;
  return Math.abs(localX) <= item.width / 2 + pad && Math.abs(localY) <= item.depth / 2 + pad;
}

export function localToWorld(item: FurnitureInstance, localX: number, localY: number): Vec2 {
  const cosine = Math.cos(item.rotation);
  const sine = Math.sin(item.rotation);
  return {
    x: item.x + localX * cosine - localY * sine,
    y: item.y + localX * sine + localY * cosine,
  };
}

export function furnitureCorners(item: FurnitureInstance, inset = 0): Vec2[] {
  const halfWidth = Math.max(item.width / 2 - inset, 0.01);
  const halfDepth = Math.max(item.depth / 2 - inset, 0.01);
  return [
    localToWorld(item, -halfWidth, -halfDepth),
    localToWorld(item, halfWidth, -halfDepth),
    localToWorld(item, halfWidth, halfDepth),
    localToWorld(item, -halfWidth, halfDepth),
  ];
}

export function polygonsOverlap(first: Vec2[], second: Vec2[]): boolean {
  const axes: Vec2[] = [];
  for (const polygon of [first, second]) {
    for (let index = 0; index < polygon.length; index += 1) {
      const current = polygon[index];
      const next = polygon[(index + 1) % polygon.length];
      if (!current || !next) continue;
      const edgeX = next.x - current.x;
      const edgeY = next.y - current.y;
      const edgeLength = Math.hypot(edgeX, edgeY) || 1;
      axes.push({ x: -edgeY / edgeLength, y: edgeX / edgeLength });
    }
  }
  for (const axis of axes) {
    let aMin = Infinity;
    let aMax = -Infinity;
    let bMin = Infinity;
    let bMax = -Infinity;
    for (const point of first) {
      const projected = point.x * axis.x + point.y * axis.y;
      aMin = Math.min(aMin, projected);
      aMax = Math.max(aMax, projected);
    }
    for (const point of second) {
      const projected = point.x * axis.x + point.y * axis.y;
      bMin = Math.min(bMin, projected);
      bMax = Math.max(bMax, projected);
    }
    if (aMax < bMin || bMax < aMin) return false;
  }
  return true;
}

export function distancePointToPolygon(point: Vec2, polygon: Vec2[]): number {
  if (pointInPolygon(point, polygon)) return 0;
  let best = Infinity;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    if (!current || !next) continue;
    best = Math.min(best, closestPointOnSegment(point, current, next).distance);
  }
  return best;
}

export function wallDirection(wall: Wall): Vec2 {
  return normalizeSafe(wall);
}

function normalizeSafe(wall: Wall): Vec2 {
  const len = Math.max(distance(wall.a, wall.b), 1e-9);
  return { x: (wall.b.x - wall.a.x) / len, y: (wall.b.y - wall.a.y) / len };
}

export function wallNormal(wall: Wall): Vec2 {
  const direction = wallDirection(wall);
  return { x: -direction.y, y: direction.x };
}

export function pointAlongWall(wall: Wall, distanceFromStart: number): Vec2 {
  const direction = wallDirection(wall);
  return {
    x: wall.a.x + direction.x * distanceFromStart,
    y: wall.a.y + direction.y * distanceFromStart,
  };
}

export function segmentQuad(wall: Wall, start: number, end: number): Vec2[] {
  const direction = wallDirection(wall);
  const normal = { x: -direction.y * wall.thickness / 2, y: direction.x * wall.thickness / 2 };
  const a = pointAlongWall(wall, start);
  const b = pointAlongWall(wall, end);
  return [
    { x: a.x + normal.x, y: a.y + normal.y },
    { x: b.x + normal.x, y: b.y + normal.y },
    { x: b.x - normal.x, y: b.y - normal.y },
    { x: a.x - normal.x, y: a.y - normal.y },
  ];
}
