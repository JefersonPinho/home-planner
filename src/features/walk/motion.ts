import { presentRooms } from "@/features/rooms/present";
import { wallVolumes } from "@/lib/geometry/wall-join";
import { closestPointOnSegment, furnitureCorners, pointAlongWall, pointInPolygon, wallDirection } from "@/lib/geometry/polygon";
import type { Door, SceneDocument, Vec2, Wall } from "@/types/scene";

export const PLAYER_RADIUS = 0.25;
export const PLAYER_HEIGHT = 1.7;
export const EYE_HEIGHT = 1.65;
export const WALK_SPEED = 1.45;
export const RUN_SPEED = 2.85;
export const OPEN_ANGLE = 1.2;
export const LOOK_LIMIT = 1.2;

export function obstaclePolygons(document: SceneDocument, doorAngles: ReadonlyMap<string, number>): Vec2[][] {
  const polygons: Vec2[][] = [];
  for (const wall of document.walls) {
    for (const volume of wallVolumes(wall, document.walls, document.openings)) {
      if (volume.bottom >= PLAYER_HEIGHT - 0.05 || volume.top <= 0.2) continue;
      polygons.push(volume.polygon);
    }
  }
  for (const item of document.furniture) {
    if (item.height < 0.25) continue;
    polygons.push(furnitureCorners(item, 0));
  }
  for (const opening of document.openings) {
    if (opening.kind !== "door" || opening.height < 1.45) continue;
    const wall = document.walls.find((entry) => entry.id === opening.wallId);
    if (!wall) continue;
    polygons.push(doorLeafPolygon(wall, opening, doorAngles.get(opening.id) ?? 0));
  }
  return polygons;
}

export function doorLeafPolygon(wall: Wall, door: Door, angle: number): Vec2[] {
  const direction = wallDirection(wall);
  const center = pointAlongWall(wall, door.offset);
  const hingeSign = door.swing === "left" ? -1 : 1;
  const hinge = {
    x: center.x + direction.x * hingeSign * (door.width / 2),
    y: center.y + direction.y * hingeSign * (door.width / 2),
  };
  const closed = { x: -hingeSign * direction.x, y: -hingeSign * direction.y };
  const swingSign = (door.flip ? -1 : 1) * (door.swing === "left" ? 1 : -1);
  const phi = swingSign * angle;
  const cosine = Math.cos(phi);
  const sine = Math.sin(phi);
  const leaf = {
    x: closed.x * cosine - closed.y * sine,
    y: closed.x * sine + closed.y * cosine,
  };
  const length = Math.max(door.width - 0.04, 0.2);
  const tip = { x: hinge.x + leaf.x * length, y: hinge.y + leaf.y * length };
  const opened = Math.min(Math.abs(angle) / 0.45, 1);
  const thickness = wall.thickness * (1 - opened) + 0.06 * opened;
  return segmentQuad(hinge, tip, thickness);
}

export function slide(position: Vec2, delta: Vec2, polygons: Vec2[][]): Vec2 {
  const distance = Math.hypot(delta.x, delta.y);
  const steps = Math.max(1, Math.ceil(distance / 0.08));
  let current = position;
  for (let step = 0; step < steps; step += 1) {
    const horizontal = pushCircle({ x: current.x + delta.x / steps, y: current.y }, polygons);
    current = pushCircle({ x: horizontal.x, y: horizontal.y + delta.y / steps }, polygons);
  }
  return current;
}

export function isWalkable(point: Vec2, polygons: Vec2[][]): boolean {
  const resolved = pushCircle(point, polygons);
  return Math.hypot(resolved.x - point.x, resolved.y - point.y) < 0.015;
}

export function findSpawn(document: SceneDocument, doorAngles: ReadonlyMap<string, number> = new Map()): Vec2 | null {
  const polygons = obstaclePolygons(document, doorAngles);
  const rooms = presentRooms(document.walls, document.rooms).slice().sort((a, b) => b.usefulArea - a.usefulArea);
  for (const room of rooms) {
    const area = room.inner.length >= 3 ? room.inner : room.polygon;
    const point = clearestPoint(area, polygons);
    if (point) return point;
  }
  return null;
}

export function forwardYaw(from: Vec2, toward: Vec2): number {
  // World -Z is plan +Y, and yaw 0 looks along world -Z.
  return Math.atan2(-(toward.x - from.x), toward.y - from.y);
}

function clearestPoint(area: Vec2[], polygons: Vec2[][]): Vec2 | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of area) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  let best: Vec2 | null = null;
  let bestClearance = 0;
  for (let x = minX + 0.15; x <= maxX - 0.15; x += 0.3) {
    for (let y = minY + 0.15; y <= maxY - 0.15; y += 0.3) {
      const point = { x, y };
      if (!pointInPolygon(point, area) || !isWalkable(point, polygons)) continue;
      const clearance = distanceToObstacles(point, polygons);
      if (clearance > bestClearance) {
        best = point;
        bestClearance = clearance;
      }
    }
  }
  return best;
}

function distanceToObstacles(point: Vec2, polygons: Vec2[][]): number {
  let best = Infinity;
  for (const polygon of polygons) {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (!start || !end) continue;
      best = Math.min(best, closestPointOnSegment(point, start, end).distance);
    }
  }
  return best;
}

function pushCircle(point: Vec2, polygons: Vec2[][]): Vec2 {
  let current = point;
  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false;
    for (const polygon of polygons) {
      const next = separate(current, polygon);
      if (!next) continue;
      current = next;
      moved = true;
    }
    if (!moved) break;
  }
  return current;
}

function separate(point: Vec2, polygon: Vec2[]): Vec2 | null {
  let bestDistance = Infinity;
  let closest = point;
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (!start || !end) continue;
    const hit = closestPointOnSegment(point, start, end);
    if (hit.distance < bestDistance) {
      bestDistance = hit.distance;
      closest = hit.point;
    }
  }
  const inside = pointInPolygon(point, polygon);
  if (!inside && bestDistance >= PLAYER_RADIUS) return null;
  const outwardX = closest.x - point.x;
  const outwardY = closest.y - point.y;
  const length = Math.hypot(outwardX, outwardY);
  if (inside) {
    if (length < 1e-6) return { x: point.x + PLAYER_RADIUS, y: point.y };
    return {
      x: closest.x + (outwardX / length) * (PLAYER_RADIUS + 0.001),
      y: closest.y + (outwardY / length) * (PLAYER_RADIUS + 0.001),
    };
  }
  const overlap = PLAYER_RADIUS - bestDistance;
  if (length < 1e-6 || overlap <= 0) return null;
  return {
    x: point.x - (outwardX / length) * overlap,
    y: point.y - (outwardY / length) * overlap,
  };
}

function segmentQuad(start: Vec2, end: Vec2, thickness: number): Vec2[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * (thickness / 2);
  const ny = (dx / length) * (thickness / 2);
  return [
    { x: start.x + nx, y: start.y + ny },
    { x: end.x + nx, y: end.y + ny },
    { x: end.x - nx, y: end.y - ny },
    { x: start.x - nx, y: start.y - ny },
  ];
}
