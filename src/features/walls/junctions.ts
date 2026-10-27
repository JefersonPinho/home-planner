import { closestPointOnSegment } from "@/lib/geometry/polygon";
import { roundMm } from "@/lib/format";
import { newId } from "@/lib/id";
import { clampOpeningToWall, wallLength } from "@/features/walls/intervals";
import type { SceneDocument, Vec2, Wall } from "@/types/scene";

export function splitAtJunctions(document: SceneDocument): boolean {
  let changed = false;
  for (let guard = 0; guard < 48; guard += 1) {
    const junction = findJunction(document.walls);
    if (!junction) return changed;
    splitHost(document, junction.host, junction.point);
    changed = true;
  }
  return changed;
}

function findJunction(walls: Wall[]): { host: Wall; point: Vec2 } | null {
  for (const stem of walls) {
    for (const end of [stem.a, stem.b]) {
      for (const host of walls) {
        if (host.id === stem.id) continue;
        const closest = closestPointOnSegment(end, host.a, host.b);
        if (closest.distance > 0.02 || closest.t <= 0.025 || closest.t >= 0.975) continue;
        const along = closest.t * wallLength(host);
        if (along < 0.05 || wallLength(host) - along < 0.05) continue;
        return { host, point: { x: roundMm(closest.point.x), y: roundMm(closest.point.y) } };
      }
    }
  }
  return null;
}

function splitHost(document: SceneDocument, host: Wall, point: Vec2): void {
  const originalEnd = { ...host.b };
  const splitDistance = Math.hypot(point.x - host.a.x, point.y - host.a.y);
  const createdId = newId();
  host.b = point;
  const created: Wall = {
    id: createdId,
    a: { ...point },
    b: originalEnd,
    height: host.height,
    thickness: host.thickness,
  };
  document.walls.push(created);
  for (const opening of document.openings) {
    if (opening.wallId !== host.id) continue;
    if (opening.offset >= splitDistance - 0.001) {
      opening.wallId = createdId;
      opening.offset -= splitDistance;
      clampOpeningToWall(opening, created);
    } else {
      clampOpeningToWall(opening, host);
    }
  }
}
