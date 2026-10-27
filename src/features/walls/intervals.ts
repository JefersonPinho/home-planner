import { distance } from "@/lib/geometry/vec";
import type { Opening, Wall } from "@/types/scene";

export type SolidInterval = {
  start: number;
  end: number;
};

export function wallLength(wall: Wall): number {
  return distance(wall.a, wall.b);
}

export function openingsOnWall(wallId: string, openings: Opening[]): Opening[] {
  return openings
    .filter((opening) => opening.wallId === wallId)
    .slice()
    .sort((a, b) => a.offset - b.offset);
}

export function solidIntervals(wall: Wall, openings: Opening[]): SolidInterval[] {
  const length = wallLength(wall);
  if (length < 0.02) return [];
  const cuts = openingsOnWall(wall.id, openings)
    .map((opening) => {
      const half = opening.width / 2;
      return {
        start: Math.max(0, opening.offset - half),
        end: Math.min(length, opening.offset + half),
      };
    })
    .filter((cut) => cut.end - cut.start > 0.02)
    .sort((a, b) => a.start - b.start);

  const intervals: SolidInterval[] = [];
  let cursor = 0;
  for (const cut of cuts) {
    if (cut.start > cursor + 0.01) intervals.push({ start: cursor, end: cut.start });
    cursor = Math.max(cursor, cut.end);
  }
  if (length > cursor + 0.01) intervals.push({ start: cursor, end: length });
  return intervals;
}

export function clampOpeningToWall(opening: Opening, wall: Wall): void {
  const length = Math.max(wallLength(wall), 0.2);
  opening.width = Math.min(opening.width, Math.max(0.2, length - 0.04));
  const half = opening.width / 2;
  opening.offset = Math.min(Math.max(opening.offset, half), length - half);
  if (opening.kind === "door") {
    opening.height = Math.min(opening.height, wall.height);
  } else {
    opening.sill = Math.min(opening.sill, Math.max(wall.height - 0.2, 0));
    opening.height = Math.min(opening.height, Math.max(wall.height - opening.sill, 0.2));
  }
}

export function setWallLength(wall: Wall, nextLength: number): void {
  const length = wallLength(wall);
  const safe = Math.max(nextLength, 0.05);
  if (length < 1e-6) {
    wall.b = { x: wall.a.x + safe, y: wall.a.y };
    return;
  }
  const scale = safe / length;
  wall.b = {
    x: wall.a.x + (wall.b.x - wall.a.x) * scale,
    y: wall.a.y + (wall.b.y - wall.a.y) * scale,
  };
}
