import { newId } from "@/lib/id";
import { closestPointOnSegment } from "@/lib/geometry/polygon";
import { distance } from "@/lib/geometry/vec";
import type { Vec2, Wall, WindowOpening } from "@/types/scene";

export function createWindow(wall: Wall, point: Vec2): WindowOpening | null {
  const length = distance(wall.a, wall.b);
  if (length < 0.4) return null;
  const closest = closestPointOnSegment(point, wall.a, wall.b);
  if (closest.distance > Math.max(wall.thickness, 0.35)) return null;
  const width = Math.min(1.2, length - 0.08);
  const offset = Math.min(Math.max(closest.t * length, width / 2), length - width / 2);
  const sill = 0.9;
  const height = Math.min(1.1, Math.max(wall.height - sill - 0.1, 0.4));
  return {
    id: newId(),
    kind: "window",
    wallId: wall.id,
    offset,
    width,
    height,
    sill,
  };
}
