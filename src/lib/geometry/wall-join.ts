import { pointAlongWall, polygonArea, wallDirection, wallNormal } from "@/lib/geometry/polygon";
import { distance } from "@/lib/geometry/vec";
import { solidIntervals, wallLength } from "@/features/walls/intervals";
import type { Opening, Vec2, Wall } from "@/types/scene";

const JOIN_EPSILON = 0.02;

export type WallFootprint = {
  startLeft: Vec2;
  endLeft: Vec2;
  endRight: Vec2;
  startRight: Vec2;
};

export function footprintPolygon(footprint: WallFootprint): Vec2[] {
  return [footprint.startLeft, footprint.endLeft, footprint.endRight, footprint.startRight];
}

export function wallFootprint(wall: Wall, walls: Wall[]): WallFootprint {
  return {
    startLeft: capPoint(wall, walls, "a", 1),
    endLeft: capPoint(wall, walls, "b", 1),
    endRight: capPoint(wall, walls, "b", -1),
    startRight: capPoint(wall, walls, "a", -1),
  };
}

export type WallVolume = {
  polygon: Vec2[];
  bottom: number;
  top: number;
};

export function wallVolumes(wall: Wall, walls: Wall[], openings: Opening[]): WallVolume[] {
  const length = wallLength(wall);
  if (length < 0.05 || wall.height < 0.05) return [];
  const footprint = wallFootprint(wall, walls);
  const volumes: WallVolume[] = [];
  const push = (start: number, end: number, bottom: number, top: number) => {
    if (end - start < 0.02 || top - bottom < 0.02) return;
    const polygon = intervalPolygon(wall, footprint, start, end);
    if (Math.abs(polygonArea(polygon)) < 1e-5) return;
    volumes.push({ polygon, bottom, top });
  };
  for (const interval of solidIntervals(wall, openings)) push(interval.start, interval.end, 0, wall.height);
  for (const opening of openings.filter((entry) => entry.wallId === wall.id)) {
    const start = Math.max(0, opening.offset - opening.width / 2);
    const end = Math.min(length, opening.offset + opening.width / 2);
    const sill = opening.kind === "window" ? opening.sill : 0;
    const head = opening.kind === "window" ? Math.min(opening.sill + opening.height, wall.height) : Math.min(opening.height, wall.height);
    push(start, end, 0, sill);
    push(start, end, head, wall.height);
  }
  return volumes;
}

export function wallPolygons(wall: Wall, walls: Wall[], openings: Opening[]): Vec2[][] {
  const length = wallLength(wall);
  if (length < 0.05) return [];
  const footprint = wallFootprint(wall, walls);
  return solidIntervals(wall, openings).map((interval) => {
    const polygon = intervalPolygon(wall, footprint, interval.start, interval.end);
    if (Math.abs(polygonArea(polygon)) < 1e-5) return squareInterval(wall, interval.start, interval.end);
    return polygon;
  });
}

function intervalPolygon(wall: Wall, footprint: WallFootprint, start: number, end: number): Vec2[] {
  const length = wallLength(wall);
  return [sidePoint(wall, footprint, start, 1, length), sidePoint(wall, footprint, end, 1, length), sidePoint(wall, footprint, end, -1, length), sidePoint(wall, footprint, start, -1, length)];
}

function sidePoint(wall: Wall, footprint: WallFootprint, distanceAlong: number, side: 1 | -1, length: number): Vec2 {
  if (distanceAlong <= 0.004) return side === 1 ? footprint.startLeft : footprint.startRight;
  if (distanceAlong >= length - 0.004) return side === 1 ? footprint.endLeft : footprint.endRight;
  return squarePoint(wall, distanceAlong, side);
}

function squareInterval(wall: Wall, start: number, end: number): Vec2[] {
  return [squarePoint(wall, start, 1), squarePoint(wall, end, 1), squarePoint(wall, end, -1), squarePoint(wall, start, -1)];
}

function squarePoint(wall: Wall, distanceAlong: number, side: 1 | -1): Vec2 {
  const point = pointAlongWall(wall, distanceAlong);
  const normal = wallNormal(wall);
  const half = wall.thickness / 2;
  return { x: point.x + normal.x * half * side, y: point.y + normal.y * half * side };
}

function capPoint(wall: Wall, walls: Wall[], end: "a" | "b", side: 1 | -1): Vec2 {
  const point = wall[end];
  const square = squarePoint(wall, end === "a" ? 0 : wallLength(wall), side);
  if (wallLength(wall) < wall.thickness * 1.2) return square;
  const neighbors = walls.filter(
    (entry) => entry.id !== wall.id && (distance(entry.a, point) <= JOIN_EPSILON || distance(entry.b, point) <= JOIN_EPSILON),
  );
  if (neighbors.length === 0) return square;

  const away = awayFrom(wall, point);
  if (neighbors.some((neighbor) => dot(awayFrom(neighbor, point), away) < -0.96)) return square;
  if (hasCollinearPair(neighbors, point)) {
    const through = neighbors[0];
    if (!through) return square;
    return buttPoint(wall, end, side, through.thickness / 2);
  }

  let best: Vec2 | null = null;
  let bestScore = Infinity;
  for (const neighbor of neighbors) {
    const neighborAway = awayFrom(neighbor, point);
    const sumX = away.x + neighborAway.x;
    const sumY = away.y + neighborAway.y;
    const sumLength = Math.hypot(sumX, sumY);
    if (sumLength < 0.2) continue;
    const bisector = { x: sumX / sumLength, y: sumY / sumLength };
    for (const hit of edgeHits(wall, side, neighbor, point)) {
      const reach = distance(hit, point);
      const limit = Math.max(wall.thickness, neighbor.thickness) * 2.5;
      if (reach > limit) continue;
      const other = end === "a" ? wall.b : wall.a;
      if (distance(hit, other) + 0.01 < distance(hit, point)) continue;
      const score = distanceToDirection(hit, point, bisector) + reach * 0.02;
      if (score < bestScore) {
        best = hit;
        bestScore = score;
      }
    }
  }
  return best ?? square;
}

function buttPoint(wall: Wall, end: "a" | "b", side: 1 | -1, inset: number): Vec2 {
  const direction = wallDirection(wall);
  const intoWall = end === "b" ? { x: -direction.x, y: -direction.y } : direction;
  const point = wall[end];
  const base = { x: point.x + intoWall.x * inset, y: point.y + intoWall.y * inset };
  const normal = wallNormal(wall);
  const half = wall.thickness / 2;
  return { x: base.x + normal.x * half * side, y: base.y + normal.y * half * side };
}

function edgeHits(wall: Wall, side: 1 | -1, neighbor: Wall, point: Vec2): Vec2[] {
  const direction = wallDirection(wall);
  const origin = offsetPoint(wall, point, side);
  const hits: Vec2[] = [];
  for (const neighborSide of [1, -1] as const) {
    const hit = lineIntersection(origin, direction, offsetPoint(neighbor, point, neighborSide), wallDirection(neighbor));
    if (hit) hits.push(hit);
  }
  return hits;
}

function offsetPoint(wall: Wall, point: Vec2, side: 1 | -1): Vec2 {
  const normal = wallNormal(wall);
  const half = wall.thickness / 2;
  return { x: point.x + normal.x * half * side, y: point.y + normal.y * half * side };
}

function awayFrom(wall: Wall, point: Vec2): Vec2 {
  const direction = wallDirection(wall);
  return distance(wall.a, point) <= distance(wall.b, point) ? direction : { x: -direction.x, y: -direction.y };
}

function hasCollinearPair(neighbors: Wall[], point: Vec2): boolean {
  for (let index = 0; index < neighbors.length; index += 1) {
    for (let other = index + 1; other < neighbors.length; other += 1) {
      const first = neighbors[index];
      const second = neighbors[other];
      if (!first || !second) continue;
      if (dot(awayFrom(first, point), awayFrom(second, point)) < -0.96) return true;
    }
  }
  return false;
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function distanceToDirection(point: Vec2, origin: Vec2, direction: Vec2): number {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const along = dx * direction.x + dy * direction.y;
  return Math.hypot(dx - direction.x * along, dy - direction.y * along);
}

function lineIntersection(origin: Vec2, direction: Vec2, otherOrigin: Vec2, otherDirection: Vec2): Vec2 | null {
  const denominator = direction.x * otherDirection.y - direction.y * otherDirection.x;
  if (Math.abs(denominator) < 1e-8) return null;
  const dx = otherOrigin.x - origin.x;
  const dy = otherOrigin.y - origin.y;
  const t = (dx * otherDirection.y - dy * otherDirection.x) / denominator;
  return { x: origin.x + direction.x * t, y: origin.y + direction.y * t };
}
